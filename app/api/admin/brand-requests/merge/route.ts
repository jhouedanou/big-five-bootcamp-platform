/**
 * API Route: POST /api/admin/brand-requests/merge
 *
 * Fusionne plusieurs demandes de marque en une seule (gestion des doublons).
 * body: { ids: string[] }  — au moins 2 IDs requis
 *
 * Stratégie :
 * - La demande la plus ancienne (created_at le plus bas) devient la demande canonique.
 * - Les URLs et réseaux sociaux de toutes les demandes sont fusionnés (union, sans doublon).
 * - Les notes utilisateur sont concaténées si elles diffèrent.
 * - Les autres demandes sont supprimées.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin/brand-requests/merge] missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      )
    }

    const adminUser = await checkAdmin()
    if (!adminUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const body = await request.json()
    const { ids } = body as { ids?: unknown }

    if (!Array.isArray(ids) || ids.length < 2) {
      return NextResponse.json(
        { error: 'Au moins 2 identifiants sont requis pour une fusion.' },
        { status: 400 }
      )
    }

    const safeIds = ids.map(String)

    const admin = getSupabaseAdmin()

    // Charger toutes les demandes concernées
    const { data: requests, error: fetchError } = await admin
      .from('brand_requests')
      .select('*')
      .in('id', safeIds)
      .order('created_at', { ascending: true })

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    if (!requests || requests.length < 2) {
      return NextResponse.json({ error: 'Demandes introuvables.' }, { status: 404 })
    }

    // Vérifier qu'elles appartiennent toutes au même utilisateur
    const userIds = new Set(requests.map((r: any) => r.user_id))
    if (userIds.size > 1) {
      return NextResponse.json(
        { error: 'Impossible de fusionner des demandes appartenant à des utilisateurs différents.' },
        { status: 422 }
      )
    }

    // La première (la plus ancienne) est le canonical
    const [canonical, ...duplicates] = requests

    // Fusionner les URLs (union sans doublon, case-insensitive)
    const allUrls = new Set<string>()
    const allSocials = new Set<string>()
    const notesParts: string[] = []
    const adminNotesParts: string[] = []

    for (const req of requests) {
      const urls: string[] = req.brand_urls ?? (req.brand_url ? [req.brand_url] : [])
      urls.forEach((u: string) => allUrls.add(u.trim().toLowerCase()))

      const socials: string[] = req.social_networks ?? []
      socials.forEach((s: string) => {
        const normalized = s.trim().toLowerCase()
        if (normalized) allSocials.add(normalized)
      })

      const note: string | null = req.notes
      if (note && note.trim() && !notesParts.includes(note.trim())) {
        notesParts.push(note.trim())
      }

      const adminNote: string | null = req.admin_notes
      if (adminNote && adminNote.trim() && !adminNotesParts.includes(adminNote.trim())) {
        adminNotesParts.push(adminNote.trim())
      }
    }

    const mergedUrls = Array.from(allUrls)
    const mergedSocials = Array.from(allSocials)
    const mergedNotes = notesParts.join('\n---\n') || null
    const mergedAdminNotes = adminNotesParts.join('\n---\n') || null

    const originalCanonical = {
      brand_urls: canonical.brand_urls ?? (canonical.brand_url ? [canonical.brand_url] : []),
      brand_url: canonical.brand_url ?? null,
      social_networks: canonical.social_networks ?? [],
      notes: canonical.notes ?? null,
      admin_notes: canonical.admin_notes ?? null,
    }

    // Mettre à jour la demande canonique
    const { data: updated, error: updateError } = await admin
      .from('brand_requests')
      .update({
        brand_urls: mergedUrls,
        brand_url: mergedUrls[0] ?? null,
        social_networks: mergedSocials,
        notes: mergedNotes,
        admin_notes: mergedAdminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', canonical.id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Supprimer les doublons
    const duplicateIds = duplicates.map((r: any) => r.id)
    const { error: deleteError } = await admin
      .from('brand_requests')
      .delete()
      .in('id', duplicateIds)

    if (deleteError) {
      // Compensation: restaurer les champs fusionnés du canonical si la suppression échoue
      const { error: rollbackError } = await admin
        .from('brand_requests')
        .update({
          brand_urls: originalCanonical.brand_urls,
          brand_url: originalCanonical.brand_url,
          social_networks: originalCanonical.social_networks,
          notes: originalCanonical.notes,
          admin_notes: originalCanonical.admin_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', canonical.id)

      if (rollbackError) {
        return NextResponse.json(
          { error: `Suppression des doublons échouée: ${deleteError.message}. Rollback échoué: ${rollbackError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: `Suppression des doublons échouée: ${deleteError.message}. Les changements ont été annulés.` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      merged: updated,
      deleted: duplicateIds,
    })
  } catch (e: any) {
    console.error('[admin/brand-requests/merge]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
