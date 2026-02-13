/**
 * API Route: GET /api/users/recent
 * 
 * Récupère les 4 utilisateurs les plus récents avec leurs initiales
 * Données publiques uniquement (pas d'email, pas d'ID)
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600; // Cache 1 heure

export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('name, created_at')
      .order('created_at', { ascending: false })
      .limit(4);

    if (error) {
      console.error('Erreur récupération utilisateurs récents:', error.message);
      return NextResponse.json({ users: [] });
    }

    const recentUsers = (users || []).map((user: any) => {
      const name = user.name || 'Utilisateur';
      const parts = name.trim().split(/\s+/);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

      return { initials };
    });

    return NextResponse.json({ users: recentUsers });
  } catch (error) {
    console.error('Erreur API users/recent:', error);
    return NextResponse.json({ users: [] });
  }
}
