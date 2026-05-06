/**
 * API Route: /api/brands
 *
 * Renvoie la liste distincte des marques présentes dans les campagnes publiées.
 * Utilisée par le formulaire de demande de suivi de marques pour l'autocomplétion.
 *
 *   GET → { brands: string[] }
 */

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = getSupabaseAdmin()

    // On lit toutes les valeurs `brand` non nulles puis on dédoublonne en mémoire.
    // Supabase n'expose pas directement de DISTINCT côté PostgREST.
    const { data, error } = await admin
      .from('campaigns')
      .select('brand')
      .not('brand', 'is', null)
      .limit(5000)

    if (error) {
      console.error('[api/brands] db error:', error)
      return NextResponse.json({ brands: [] }, { status: 200 })
    }

    const seen = new Set<string>()
    const brands: string[] = []
    for (const row of data || []) {
      const raw = (row as { brand?: string | null }).brand
      const value = (raw || '').trim()
      if (!value) continue
      const key = value.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      brands.push(value)
    }
    brands.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))

    return NextResponse.json({ brands })
  } catch (err) {
    console.error('[api/brands] unexpected error:', err)
    return NextResponse.json({ brands: [] }, { status: 200 })
  }
}
