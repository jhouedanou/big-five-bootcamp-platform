import { NextRequest, NextResponse } from 'next/server'
import { validateLicense } from '@/lib/chariow'
import { getAuthenticatedUser, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Auth requise — empêche l'énumération publique de clés de licence.
    const authUser = await getAuthenticatedUser()
    if (!authUser) {
      return NextResponse.json({ valid: false, error: 'Non autorisé' }, { status: 401 })
    }

    const { licenseKey } = await request.json()
    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json({ valid: false, error: 'licenseKey requis' }, { status: 400 })
    }
    const key = licenseKey.trim()

    // Un non-admin ne peut valider que SA propre clé (anti-énumération).
    if (!authUser.isAdmin) {
      const admin = getSupabaseAdmin()
      const { data: profile } = await admin
        .from('users')
        .select('license_key')
        .eq('id', authUser.id)
        .single()
      if (!profile || (profile as any).license_key !== key) {
        return NextResponse.json({ valid: false, error: 'Non autorisé' }, { status: 403 })
      }
    }

    const result = await validateLicense(key)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { valid: false, error: e?.message || 'Erreur validation licence' },
      { status: 500 }
    )
  }
}
