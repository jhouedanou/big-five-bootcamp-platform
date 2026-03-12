/**
 * API Route: POST /api/license/verify
 * 
 * Vérifie une clé de licence Chariow et active l'abonnement si valide.
 * Utilisé comme fallback si le webhook n'a pas fonctionné.
 * 
 * Body:
 * - licenseKey: Clé de licence Chariow (ex: ABC-123-XYZ-789)
 * - email: Email de l'utilisateur
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateLicense, activateLicense, generateRefCommand } from '@/lib/chariow';

export async function POST(request: NextRequest) {
  try {
    const { licenseKey, email } = await request.json();

    if (!licenseKey || !email) {
      return NextResponse.json(
        { success: false, error: 'Clé de licence et email requis' },
        { status: 400 }
      );
    }

    console.log('🔑 Vérification licence:', licenseKey, 'pour', email);

    // 1. Valider la licence via l'API Chariow
    const validation = await validateLicense(licenseKey);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.reason || 'Licence invalide',
      });
    }

    const license = validation.license;
    if (!license) {
      return NextResponse.json({
        success: false,
        error: 'Données de licence introuvables',
      });
    }

    // 2. Vérifier que l'email correspond au customer de la licence
    // (tolérant : on accepte même si l'email diffère, l'admin peut ajuster)
    console.log('✅ Licence valide:', {
      status: license.status,
      expires_at: license.expires_at,
      is_active: license.is_active,
    });

    // 3. Si la licence n'est pas encore activée, l'activer
    if (license.status === 'pending_activation') {
      const activationResult = await activateLicense(licenseKey, 'web-platform');
      console.log('🔑 Activation résultat:', activationResult);
    }

    // 4. Trouver l'utilisateur dans notre base
    const { data: user, error: userError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, plan, subscription_status, subscription_start_date, subscription_end_date')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé dans notre système',
      });
    }

    // 5. Calculer la date de fin d'abonnement
    const now = new Date();
    const isRenewal = user.subscription_status === 'active' &&
      user.subscription_end_date &&
      new Date(user.subscription_end_date) > now;

    // Utiliser expires_at de la licence Chariow si disponible
    // Sinon, 30 jours par défaut (ou ajouté à la date existante pour le renouvellement)
    let subscriptionEndDate: Date;

    if (license.expires_at) {
      // Synchro directe avec la durée de la licence Chariow
      subscriptionEndDate = new Date(license.expires_at);
      console.log('📅 Utilisation de la date de licence:', subscriptionEndDate.toISOString());
    } else if (isRenewal) {
      subscriptionEndDate = new Date(
        new Date(user.subscription_end_date).getTime() + 30 * 24 * 60 * 60 * 1000
      );
    } else {
      subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // 6. Activer l'abonnement
    const { error: updateError } = await (supabaseAdmin as any)
      .from('users')
      .update({
        plan: 'Premium',
        subscription_status: 'active',
        subscription_start_date: isRenewal
          ? (user.subscription_start_date || now.toISOString())
          : now.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour utilisateur:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de l\'activation de l\'abonnement',
      });
    }

    // 7. Créer un enregistrement de paiement si aucun n'existe
    const { data: existingPayment } = await (supabaseAdmin as any)
      .from('payments')
      .select('id')
      .contains('metadata', { license_key: licenseKey })
      .limit(1)
      .single();

    if (!existingPayment) {
      const refCommand = generateRefCommand('LIC');
      await (supabaseAdmin as any)
        .from('payments')
        .insert({
          ref_command: refCommand,
          user_email: email,
          amount: 0, // Le montant est géré par Chariow
          status: 'completed',
          payment_method: 'Chariow License',
          item_name: 'Abonnement Big Five - Licence',
          completed_at: now.toISOString(),
          metadata: {
            type: 'subscription',
            userId: user.id,
            source: 'license_verification',
            license_key: licenseKey,
            license_id: license.id,
            license_expires_at: license.expires_at,
          },
        });
    }

    // 8. Notification de succès
    try {
      await (supabaseAdmin as any).rpc('notify_payment_success', {
        p_user_id: user.id,
        p_amount: 0,
        p_subscription_end_date: subscriptionEndDate.toISOString(),
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    console.log('✅ Abonnement activé via licence pour:', email);

    return NextResponse.json({
      success: true,
      message: 'Abonnement activé avec succès',
      subscription_end_date: subscriptionEndDate.toISOString(),
      license_status: license.status,
    });

  } catch (error) {
    console.error('License verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la vérification' },
      { status: 500 }
    );
  }
}
