/**
 * API Route: GET /api/payment/debug-webhook
 * 
 * Endpoint de diagnostic pour vérifier :
 * - Les derniers paiements
 * - L'état des utilisateurs
 * - Si le webhook Chariow fonctionne
 * 
 * ⚠️ À retirer en production une fois le debug terminé
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { listLicenses, CHARIOW_CONFIG } from '@/lib/chariow';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');

    const results: any = {
      timestamp: new Date().toISOString(),
      chariow_config: {
        api_key_set: !!CHARIOW_CONFIG.API_KEY,
        product_id: CHARIOW_CONFIG.PRODUCT_ID || 'NOT SET',
        webhook_url: CHARIOW_CONFIG.WEBHOOK_URL,
      },
    };

    // 1. Derniers paiements (les 10 plus récents)
    const { data: recentPayments, error: paymentsError } = await (supabaseAdmin as any)
      .from('payments')
      .select('id, ref_command, user_email, status, amount, payment_method, chariow_sale_id, completed_at, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(10);

    results.recent_payments = {
      count: recentPayments?.length || 0,
      error: paymentsError?.message || null,
      data: recentPayments?.map((p: any) => ({
        id: p.id,
        ref_command: p.ref_command,
        email: p.user_email,
        status: p.status,
        amount: p.amount,
        method: p.payment_method,
        sale_id: p.chariow_sale_id,
        completed_at: p.completed_at,
        created_at: p.created_at,
        has_license: !!p.metadata?.license_key,
        source: p.metadata?.source || p.metadata?.type || 'unknown',
      })),
    };

    // 2. Si email fourni, vérifier l'utilisateur
    if (email) {
      const { data: user, error: userError } = await (supabaseAdmin as any)
        .from('users')
        .select('id, email, name, plan, subscription_status, subscription_start_date, subscription_end_date, updated_at')
        .eq('email', email)
        .single();

      results.user = {
        found: !!user,
        error: userError?.message || null,
        data: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          subscription_status: user.subscription_status,
          subscription_start: user.subscription_start_date,
          subscription_end: user.subscription_end_date,
          updated_at: user.updated_at,
          is_expired: user.subscription_end_date ? new Date(user.subscription_end_date) < new Date() : null,
        } : null,
      };

      // Paiements de cet utilisateur
      const { data: userPayments } = await (supabaseAdmin as any)
        .from('payments')
        .select('id, ref_command, status, amount, chariow_sale_id, completed_at, created_at, metadata')
        .eq('user_email', email)
        .order('created_at', { ascending: false })
        .limit(5);

      results.user_payments = userPayments?.map((p: any) => ({
        id: p.id,
        ref: p.ref_command,
        status: p.status,
        amount: p.amount,
        sale_id: p.chariow_sale_id,
        completed: p.completed_at,
        created: p.created_at,
        license_key: p.metadata?.license_key || null,
      }));
    }

    // 3. Vérifier les licences actives dans Chariow
    try {
      const licenses = await listLicenses({ 
        product_id: CHARIOW_CONFIG.PRODUCT_ID,
        status: 'active' 
      });
      results.chariow_licenses = {
        active_count: Array.isArray(licenses) ? licenses.length : 0,
        sample: Array.isArray(licenses) ? licenses.slice(0, 3).map((l: any) => ({
          id: l.id,
          key: l.license?.key || l.license_key,
          status: l.status,
          customer_email: l.customer?.email,
          expires_at: l.expires_at,
        })) : [],
      };
    } catch (licenseError: any) {
      results.chariow_licenses = {
        error: licenseError?.message || 'Failed to fetch',
      };
    }

    return NextResponse.json(results, { 
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3),
    }, { status: 500 });
  }
}
