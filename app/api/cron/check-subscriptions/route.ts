/**
 * API Route: GET /api/cron/check-subscriptions
 * 
 * Vérifie les abonnements expirés et les downgrade automatiquement.
 * À appeler via un cron job Vercel (vercel.json) ou manuellement.
 * 
 * Sécurité: Protégé par CRON_SECRET dans les headers
 * 
 * Logique:
 * 1. Trouver les utilisateurs avec subscription_end_date < NOW() et subscription_status = 'active'
 * 2. Mettre subscription_status = 'expired' et plan = 'Free'
 * 3. Logger les utilisateurs downgradués
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Vérification de sécurité : CRON_SECRET ou Authorization header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // En production, vérifier le secret (Vercel Cron envoie le header automatiquement)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // 1. Trouver les abonnements actifs qui ont expiré
    const { data: expiredUsers, error: fetchError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, name, plan, subscription_status, subscription_end_date')
      .eq('subscription_status', 'active')
      .lt('subscription_end_date', now);

    if (fetchError) {
      console.error('❌ Erreur récupération abonnements expirés:', fetchError.message);
      return NextResponse.json(
        { error: 'Erreur de base de données', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log('✅ Aucun abonnement expiré trouvé');
      return NextResponse.json({
        success: true,
        message: 'Aucun abonnement expiré',
        downgraded: 0,
        checked_at: now,
      });
    }

    console.log(`⏰ ${expiredUsers.length} abonnement(s) expiré(s) trouvé(s)`);

    // 2. Downgrader tous les utilisateurs expirés
    const userIds = expiredUsers.map((u: any) => u.id);

    const { error: updateError } = await (supabaseAdmin as any)
      .from('users')
      .update({
        plan: 'Free',
        subscription_status: 'expired',
        updated_at: now,
      })
      .in('id', userIds);

    if (updateError) {
      console.error('❌ Erreur downgrade abonnements:', updateError.message);
      return NextResponse.json(
        { error: 'Erreur lors du downgrade', details: updateError.message },
        { status: 500 }
      );
    }

    // 3. Créer des notifications d'expiration pour chaque utilisateur
    for (const user of expiredUsers) {
      try {
        await (supabaseAdmin as any)
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'subscription_expired',
            title: '⏰ Votre abonnement Premium a expiré',
            message: 'Votre abonnement Premium a expiré. Renouvelez-le pour continuer à accéder aux contenus Premium.',
            metadata: {
              subscription_end_date: user.subscription_end_date,
              previous_plan: user.plan,
            },
          });
      } catch (notifError) {
        console.warn('⚠️ Erreur notification pour', user.email, ':', notifError);
      }
    }

    // 4. Logger les résultats
    const downgraded = expiredUsers.map((u: any) => ({
      email: u.email,
      name: u.name,
      expired_at: u.subscription_end_date,
    }));

    console.log('✅ Abonnements downgradués:', JSON.stringify(downgraded, null, 2));

    return NextResponse.json({
      success: true,
      message: `${expiredUsers.length} abonnement(s) downgradué(s)`,
      downgraded: expiredUsers.length,
      users: downgraded,
      checked_at: now,
    });

  } catch (error: any) {
    console.error('❌ Erreur cron check-subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
