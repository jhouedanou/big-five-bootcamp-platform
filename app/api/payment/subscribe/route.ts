/**
 * API Route: POST /api/payment/subscribe
 * 
 * Crée une demande de paiement Chariow pour un abonnement mensuel
 * Prix: 25 000 XOF/mois - Valable 1 mois
 * 
 * Body:
 * - userEmail: Email de l'utilisateur
 * - phoneNumber?: Numéro de téléphone
 * - phoneCountryCode?: Code pays ISO (ex: "CI", "SN", "BJ")
 * - firstName?: Prénom de l'utilisateur
 * - lastName?: Nom de l'utilisateur
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  createSubscriptionCheckout,
  generateRefCommand,
} from '@/lib/chariow';

// Prix de l'abonnement mensuel
const SUBSCRIPTION_PRICE = 25000; // 25 000 XOF
const SUBSCRIPTION_DURATION_DAYS = 30; // 1 mois

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, phoneNumber, phoneCountryCode, firstName, lastName } = body;

    console.log('📨 Requête d\'abonnement reçue:', { userEmail });

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

      const { data: authListData } = await supabaseAdmin.auth.admin.listUsers() as any;
      const authUser = authListData?.users?.find((u: any) => u.email === userEmail);

      if (!authUser) {
        console.error('❌ Utilisateur non trouvé dans Auth');
        return NextResponse.json(
          { error: 'Utilisateur non trouvé. Veuillez vous inscrire d\'abord.' },
          { status: 404 }
        );
      }

      const { data: newUser, error: createError } = await (supabaseAdmin as any)
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
      console.log('✅ Utilisateur créé:', (existingUser as any)?.id);
    }

    // Permettre le renouvellement anticipé :
    // Si l'abonnement est encore actif, on ajoute 30 jours à la date de fin existante
    // Sinon on part d'aujourd'hui + 30 jours
    const isRenewal = (existingUser as any).subscription_status === 'active' && 
        (existingUser as any).subscription_end_date && 
        new Date((existingUser as any).subscription_end_date) > new Date();

    if (isRenewal) {
      console.log('🔄 Renouvellement anticipé détecté — abonnement actif jusqu\'au', (existingUser as any).subscription_end_date);
    }

    // Générer la référence de commande unique
    const ref_command = generateRefCommand(isRenewal ? 'REN' : 'SUB');

    // Date de fin de l'abonnement :
    // - Renouvellement : date_fin_existante + 30 jours (on ne perd pas les jours restants)
    // - Nouvel abonnement : aujourd'hui + 30 jours
    const subscriptionEndDate = isRenewal
      ? new Date(new Date((existingUser as any).subscription_end_date).getTime() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    // Extraire prénom/nom
    const userName = (existingUser as any).name || '';
    const nameParts = userName.split(' ');
    const userFirstName = firstName || nameParts[0] || userEmail.split('@')[0];
    const userLastName = lastName || nameParts.slice(1).join(' ') || 'Client';

    // Enregistrer la demande de paiement dans la base de données
    console.log('💾 Création enregistrement paiement...');
    
    const paymentInsert = {
      user_email: userEmail,
      amount: SUBSCRIPTION_PRICE,
      status: 'pending',
      payment_method: 'Chariow',
      ref_command,
      item_name: 'Abonnement Big Five - 1 mois',
      metadata: {
        type: 'subscription',
        duration_days: SUBSCRIPTION_DURATION_DAYS,
        subscription_end_date: subscriptionEndDate.toISOString(),
        userId: (existingUser as any).id,
        phoneNumber: phoneNumber || null,
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

    // Créer le checkout Chariow
    const chariowResponse = await createSubscriptionCheckout({
      email: userEmail,
      firstName: userFirstName,
      lastName: userLastName,
      phoneNumber: phoneNumber || '0000000000',
      phoneCountryCode: phoneCountryCode || 'CI',
      refCommand: ref_command,
      userId: (existingUser as any).id,
    });

    // Vérifier la réponse selon le step
    if (chariowResponse.data.step === 'already_purchased') {
      return NextResponse.json(
        { error: 'Vous avez déjà acheté ce produit' },
        { status: 409 }
      );
    }

    if (chariowResponse.data.step === 'payment' && chariowResponse.data.payment?.checkout_url) {
      // Mettre à jour le paiement avec l'ID de vente Chariow
      await (supabaseAdmin as any)
        .from('payments')
        .update({ 
          chariow_sale_id: chariowResponse.data.purchase?.id,
          metadata: {
            ...(payment as any).metadata,
            chariow_response: {
              sale_id: chariowResponse.data.purchase?.id,
              transaction_id: chariowResponse.data.payment?.transaction_id,
            }
          }
        })
        .eq('id', (payment as any).id);

      return NextResponse.json({
        success: true,
        payment_id: (payment as any).id,
        ref_command,
        redirect_url: chariowResponse.data.payment.checkout_url,
        sale_id: chariowResponse.data.purchase?.id,
        amount: SUBSCRIPTION_PRICE,
        duration_days: SUBSCRIPTION_DURATION_DAYS,
        subscription_end_date: subscriptionEndDate.toISOString(),
      });
    }

    if (chariowResponse.data.step === 'completed') {
      // Produit gratuit - complété directement
      await (supabaseAdmin as any)
        .from('payments')
        .update({ 
          status: 'completed',
          chariow_sale_id: chariowResponse.data.purchase?.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', (payment as any).id);

      return NextResponse.json({
        success: true,
        payment_id: (payment as any).id,
        ref_command,
        completed: true,
        sale_id: chariowResponse.data.purchase?.id,
      });
    }

    // Échec
    await (supabaseAdmin as any)
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', (payment as any).id);

    return NextResponse.json(
      { error: 'Impossible de créer le checkout Chariow' },
      { status: 500 }
    );

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
