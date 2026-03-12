/**
 * API Route: GET /api/notifications
 * 
 * Récupère les notifications de l'utilisateur connecté
 * 
 * Query params:
 * - read: boolean (optionnel) - Filtrer par statut lu/non-lu
 * - type: string (optionnel) - Filtrer par type de notification
 * - limit: number (optionnel) - Nombre max de notifications (défaut: 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Récupérer les paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const read = searchParams.get('read');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Construire la requête
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Appliquer les filtres
    if (read !== null) {
      query = query.eq('read', read === 'true');
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notifications' },
        { status: 500 }
      );
    }

    // Compter les non-lues
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({
      success: true,
      notifications,
      unread_count: unreadCount || 0,
    });

  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
