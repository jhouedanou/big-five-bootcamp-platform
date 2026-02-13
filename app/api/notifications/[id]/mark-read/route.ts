/**
 * API Route: PATCH /api/notifications/[id]/mark-read
 * 
 * Marque une notification comme lue
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Dans Next.js 15+, params est une Promise
    const { id } = await params;
    
    // Récupérer l'utilisateur connecté
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const notificationId = id;

    // Vérifier que la notification appartient à l'utilisateur
    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notification introuvable' },
        { status: 404 }
      );
    }

    // Marquer comme lue
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      } as any)
      .eq('id', notificationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error marking notification as read:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: updated,
    });

  } catch (error) {
    console.error('Mark read API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
