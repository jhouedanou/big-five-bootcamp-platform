/**
 * API Route: POST /api/notifications/mark-all-read
 * 
 * Marque toutes les notifications de l'utilisateur comme lues
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Récupérer l'utilisateur connecté
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Marquer toutes les notifications comme lues
    const { data, error } = await (supabaseAdmin as any)
      .from('notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', user.id)
      .eq('read', false)
      .select();

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
    });

  } catch (error) {
    console.error('Mark all read API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
