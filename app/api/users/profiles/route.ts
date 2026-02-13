/**
 * API Route: GET /api/users/profiles
 * 
 * Récupère les profils publics des utilisateurs avec le nombre de favoris
 * Données publiques uniquement (pas d'email complet, pas de données sensibles)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 300; // Cache 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Récupérer les utilisateurs avec le nombre de favoris
    const { data: users, error, count } = await (supabaseAdmin as any)
      .from('users')
      .select('id, name, plan, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erreur récupération profils:', error.message);
      return NextResponse.json({ users: [], total: 0 });
    }

    // Récupérer le nombre de favoris pour chaque utilisateur
    const userIds = (users || []).map((u: any) => u.id);
    
    let favoriteCounts: Record<string, number> = {};
    if (userIds.length > 0) {
      const { data: favData, error: favError } = await (supabaseAdmin as any)
        .from('favorites')
        .select('user_id')
        .in('user_id', userIds);

      if (!favError && favData) {
        favData.forEach((f: any) => {
          favoriteCounts[f.user_id] = (favoriteCounts[f.user_id] || 0) + 1;
        });
      }
    }

    const profiles = (users || []).map((user: any) => {
      const name = user.name || 'Utilisateur';
      const parts = name.trim().split(/\s+/);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

      return {
        id: user.id,
        name: user.name || 'Utilisateur',
        initials,
        plan: user.plan || 'Free',
        joinedAt: user.created_at,
        favoritesCount: favoriteCounts[user.id] || 0,
      };
    });

    return NextResponse.json({
      users: profiles,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Erreur API users/profiles:', error);
    return NextResponse.json({ users: [], total: 0 });
  }
}
