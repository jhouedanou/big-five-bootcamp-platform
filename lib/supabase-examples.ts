// Exemples d'API routes utilisant Supabase
// À utiliser comme référence pour créer vos routes API

import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// ============================================
// Creative LibraryS
// ============================================

/**
 * GET /api/Creative Librarys
 * Récupérer tous les Creative Librarys
 */
export async function GET_AllCreative Librarys() {
  const { data, error } = await supabase
    .from('Creative Librarys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * GET /api/Creative Librarys/[slug]
 * Récupérer un Creative Library par son slug avec ses sessions
 */
export async function GET_Creative LibraryBySlug(slug: string) {
  const { data, error } = await supabase
    .from('Creative Librarys')
    .select(`
      *,
      sessions (
        id,
        start_date,
        end_date,
        location,
        city,
        format,
        trainer_name,
        max_capacity,
        available_spots,
        status
      )
    `)
    .eq('slug', slug)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/Creative Librarys
 * Créer un nouveau Creative Library (admin only)
 */
export async function POST_CreateCreative Library(Creative LibraryData: any) {
  const { data, error } = await supabaseAdmin
    .from('Creative Librarys')
    .insert(Creative LibraryData)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// ============================================
// SESSIONS
// ============================================

/**
 * GET /api/sessions?Creative Library_id=xxx
 * Récupérer les sessions d'un Creative Library
 */
export async function GET_SessionsByCreative Library(Creative LibraryId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('Creative Library_id', Creative LibraryId)
    .order('start_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * GET /api/sessions?status=Ouvert
 * Récupérer les sessions ouvertes
 */
export async function GET_OpenSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      Creative Librarys (
        title,
        slug,
        level,
        price
      )
    `)
    .eq('status', 'Ouvert')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/sessions
 * Créer une nouvelle session (admin only)
 */
export async function POST_CreateSession(sessionData: any) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      ...sessionData,
      available_spots: sessionData.max_capacity
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// ============================================
// REGISTRATIONS
// ============================================

/**
 * POST /api/registrations
 * Créer une nouvelle inscription
 */
export async function POST_CreateRegistration(registrationData: {
  session_id: string
  user_email: string
  first_name: string
  last_name: string
  phone: string
  company?: string
  job_title?: string
  how_heard?: string
  payment_method: 'Card' | 'Transfer' | 'Quote'
  amount: number
}) {
  // 1. Vérifier que la session existe et a des places disponibles
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, available_spots, status, Creative Librarys(price)')
    .eq('id', registrationData.session_id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Session non trouvée' },
      { status: 404 }
    )
  }

  if (session.status !== 'Ouvert' || session.available_spots <= 0) {
    return NextResponse.json(
      { error: 'Cette session est complète' },
      { status: 400 }
    )
  }

  // 2. Créer l'inscription
  const { data, error } = await supabaseAdmin
    .from('registrations')
    .insert({
      ...registrationData,
      payment_status: 'Pending'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Note: Le trigger update_available_spots_on_registration
  // va automatiquement décrémenter available_spots

  return NextResponse.json(data, { status: 201 })
}

/**
 * GET /api/registrations?email=xxx
 * Récupérer les inscriptions d'un utilisateur
 */
export async function GET_UserRegistrations(email: string) {
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      *,
      sessions (
        start_date,
        end_date,
        location,
        city,
        format,
        Creative Librarys (
          title,
          slug
        )
      )
    `)
    .eq('user_email', email)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH /api/registrations/[id]
 * Mettre à jour le statut de paiement (admin only)
 */
export async function PATCH_UpdatePaymentStatus(
  registrationId: string,
  paymentStatus: 'Pending' | 'Paid' | 'Failed'
) {
  const { data, error } = await supabaseAdmin
    .from('registrations')
    .update({ payment_status: paymentStatus })
    .eq('id', registrationId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// ============================================
// STATISTIQUES & REPORTING
// ============================================

/**
 * GET /api/admin/stats
 * Statistiques globales (admin only)
 */
export async function GET_AdminStats() {
  // Nombre total d'inscriptions
  const { count: totalRegistrations } = await supabaseAdmin
    .from('registrations')
    .select('*', { count: 'exact', head: true })

  // Inscriptions payées
  const { count: paidRegistrations } = await supabaseAdmin
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'Paid')

  // Revenu total
  const { data: revenueData } = await supabaseAdmin
    .from('registrations')
    .select('amount')
    .eq('payment_status', 'Paid')

  const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0

  // Sessions actives
  const { count: activeSessions } = await supabaseAdmin
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Ouvert')
    .gte('start_date', new Date().toISOString())

  return NextResponse.json({
    totalRegistrations,
    paidRegistrations,
    totalRevenue,
    activeSessions
  })
}

/**
 * GET /api/admin/sessions/[id]/registrations
 * Liste des inscrits d'une session (admin only)
 */
export async function GET_SessionRegistrations(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// ============================================
// RECHERCHE & FILTRES
// ============================================

/**
 * GET /api/Creative Librarys/search?q=social&level=Avancé
 * Recherche de Creative Librarys avec filtres
 */
export async function GET_SearchCreative Librarys(
  searchQuery?: string,
  level?: 'Intermédiaire' | 'Avancé'
) {
  let query = supabase
    .from('Creative Librarys')
    .select('*')

  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
  }

  if (level) {
    query = query.eq('level', level)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// ============================================
// REALTIME SUBSCRIPTIONS (Client-side)
// ============================================

/**
 * Exemple de subscription en temps réel
 * À utiliser dans un composant React
 */
export function subscribeToSessionUpdates(sessionId: string, callback: (payload: any) => void) {
  const channel = supabase
    .channel(`session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`
      },
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Exemple d'utilisation dans un composant
 */
/*
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function SessionAvailability({ sessionId }: { sessionId: string }) {
  const [availableSpots, setAvailableSpots] = useState<number | null>(null)

  useEffect(() => {
    // Récupérer les données initiales
    supabase
      .from('sessions')
      .select('available_spots')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => {
        if (data) setAvailableSpots(data.available_spots)
      })

    // S'abonner aux changements
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          setAvailableSpots(payload.new.available_spots)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return <div>Places disponibles : {availableSpots ?? '...'}</div>
}
*/
