import { NextRequest, NextResponse } from 'next/server'
import { activateLicense } from '@/lib/chariow'
import { getAuthenticatedUser, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Auth requise — l'activation lie une clé à un device, opération sensible.
    const authUser = await getAuthenticatedUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { licenseKey, deviceIdentifier } = await request.json()
    if (!licenseKey || !deviceIdentifier) {
      return NextResponse.json(
        { error: 'licenseKey et deviceIdentifier requis' },
        { status: 400 }
      )
    }
    const key = String(licenseKey).trim()

    // Un non-admin ne peut activer que SA propre clé.
    if (!authUser.isAdmin) {
      const admin = getSupabaseAdmin()
      const { data: profile } = await admin
        .from('users')
        .select('license_key')
        .eq('id', authUser.id)
        .single()
      if (!profile || (profile as any).license_key !== key) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
      }
    }

    const license = await activateLicense(key, String(deviceIdentifier))
    return NextResponse.json({ success: true, license })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Erreur activation licence' },
      { status: 500 }
    )
  }
}
