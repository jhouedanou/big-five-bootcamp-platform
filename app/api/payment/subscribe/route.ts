/**
 * API Route: POST /api/payment/subscribe
 * 
 * Crée une demande de paiement PayTech pour un abonnement mensuel
 * Prix: 150 XOF/mois - Valable 1 mois
 * 
 * Body:
 * - userEmail: Email de l'utilisateur
 * - paymentMethod?: Méthode ciblée (ex: "Orange Money", "Wave", etc.)
 * - phoneNumber?: Numéro de téléphone pour Mobile Money
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  requestPayment, 
  generateRefCommand,
  type PaytechPaymentRequest 
} from '@/lib/paytech';

// Prix de l'abonnement mensuel
const SUBSCRIPTION_PRICE = 4500; // 4500 XOF
const SUBSCRIPTION_DURATION_DAYS = 30; // 1 mois

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, paymentMethod, phoneNumber } = body;

    console.log('📨 Requête d\'abonnement reçue:', { userEmail, paymentMethod });

    // Validation
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe dans la table users
    let { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_status, subscription_end_date')
      .eq('email', userEmail)
      .single();

    // Si l'utilisateur n'existe pas dans la table users, le créer
    if (!existingUser || userError?.code === 'PGRST116') {
      console.log('👤 Utilisateur non trouvé dans la table users, création...');

      // Chercher l'utilisateur par email dans Supabase Auth (via filtre)
      const { data: authListData, error: authListError } = await supabaseAdmin.auth.admin.listUsers({
        filter: userEmail,
      });
      const authUser = authListData?.users?.[0];

      if (authListError || !authUser) {
        console.error('❌ Utilisateur non trouvé dans Auth:', authListError);
        return NextResponse.json(
          { error: 'Utilisateur non trouvé. Veuillez vous inscrire d\'abord.' },
          { status: 404 }
        );
      }

      // Créer l'utilisateur dans la table users
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
          role: 'user',
          plan: 'Free',
          status: 'active',
        }, { onConflict: 'id' })
        .select('id, email, name, subscription_status, subscription_end_date')
        .single();

      if (createError) {
        console.error('❌ Erreur création utilisateur:', createError);
        return NextResponse.json(
          { error: 'Impossible de créer le profil utilisateur', details: createError.message },
          { status: 500 }
        );
      }

      existingUser = newUser;
      console.log('✅ Utilisateur créé:', existingUser?.id);
    }

    // Vérifier si un abonnement actif existe déjà
    if ((existingUser as any).subscription_status === 'active' && 
        (existingUser as any).subscription_end_date && 
        new Date((existingUser as any).subscription_end_date) > new Date()) {
      return NextResponse.json(
        { 
          error: 'You already have an active subscription',
          subscription_end_date: (existingUser as any).subscription_end_date
        },
        { status: 409 }
      );
    }

    // Générer la référence de commande unique
    const ref_command = generateRefCommand('SUB');

    // Date de fin de l'abonnement (1 mois à partir d'aujourd'hui)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + SUBSCRIPTION_DURATION_DAYS);

    // Préparer la demande PayTech
    const paymentRequest: PaytechPaymentRequest = {
      item_name: 'Abonnement Big Five - 1 mois',
      item_price: SUBSCRIPTION_PRICE,
      currency: 'XOF',
      ref_command,
      command_name: `Abonnement mensuel Big Five - ${(existingUser as any).name || (existingUser as any).email}`,
      target_payment: paymentMethod, // Méthode ciblée ou undefined pour toutes les méthodes
      custom_field: JSON.stringify({
        type: 'subscription',
        userId: (existingUser as any).id,
        userEmail,
        duration_days: SUBSCRIPTION_DURATION_DAYS,
        subscription_end_date: subscriptionEndDate.toISOString(),
        phoneNumber: phoneNumber || null,
      }),
    };

    // Enregistrer la demande de paiement dans la base de données
    console.log('💾 Création enregistrement paiement...');
    
    const paymentInsert = {
      user_email: userEmail,
      amount: SUBSCRIPTION_PRICE,
      status: 'pending',
      payment_method: paymentMethod || 'Not specified',
      ref_command,
      metadata: {
        type: 'subscription',
        duration_days: SUBSCRIPTION_DURATION_DAYS,
        subscription_end_date: subscriptionEndDate.toISOString(),
        item_name: paymentRequest.item_name,
        phoneNumber: phoneNumber || null,
        userId: (existingUser as any).id,
      },
    };

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentInsert as any)
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erreur création paiement:', paymentError);
      return NextResponse.json(
        { 
          error: 'Failed to create payment record',
          details: paymentError.message,
          hint: paymentError.hint
        },
        { status: 500 }
      );
    }

    console.log('✅ Paiement créé:', (payment as any)?.id);

    // Créer la demande de paiement PayTech
    const paytechResponse = await requestPayment(paymentRequest);

    if (paytechResponse.success !== 1 || !paytechResponse.redirect_url) {
      // Mettre à jour le statut du paiement en cas d'échec
      await supabaseAdmin
        .from('payments')
        .update({ 
          status: 'failed',
          metadata: {
            ...(payment as any).metadata,
            error: paytechResponse.message || 'PayTech request failed'
          }
        } as any)
        .eq('id', (payment as any).id);

      return NextResponse.json(
        { 
          error: paytechResponse.message || 'Failed to create PayTech payment',
          details: paytechResponse 
        },
        { status: 500 }
      );
    }

    // Mettre à jour le paiement avec le token PayTech
    await supabaseAdmin
      .from('payments')
      .update({ 
        paytech_token: paytechResponse.token,
        metadata: {
          ...(payment as any).metadata,
          paytech_response: paytechResponse
        }
      } as any)
      .eq('id', (payment as any).id);

    // Retourner l'URL de redirection PayTech
    return NextResponse.json({
      success: true,
      payment_id: (payment as any).id,
      ref_command,
      redirect_url: paytechResponse.redirect_url || paytechResponse.redirectUrl,
      token: paytechResponse.token,
      amount: SUBSCRIPTION_PRICE,
      duration_days: SUBSCRIPTION_DURATION_DAYS,
      subscription_end_date: subscriptionEndDate.toISOString(),
    });

  } catch (error) {
    console.error('Subscription payment error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
