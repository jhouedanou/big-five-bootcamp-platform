import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkAdmin } from '@/lib/admin-auth'
import { mapBannerRow, mapBannerToDb } from '@/lib/dashboard-banners'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Erreur Postgres « relation inexistante » — migration 13 non exécutée. */
const PG_UNDEFINED_TABLE = '42P01'

function failure(error: any) {
  if (error?.code === PG_UNDEFINED_TABLE) {
    return NextResponse.json(
      {
        error:
          'Table dashboard_banners absente. Exécutez la migration 13_20260812_dashboard_banners.sql.',
      },
      { status: 503 }
    )
  }
  return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 })
}

/** GET /api/admin/banners — toutes les bannières, actives ou non. */
export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('dashboard_banners')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) return failure(error)
    return NextResponse.json({ banners: (data || []).map(mapBannerRow) })
  } catch (error) {
    console.error('Erreur GET admin bannières:', error)
    return failure(error)
  }
}

/** POST /api/admin/banners — création. */
export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const payload = await request.json().catch(() => null)
    const title = String((payload as any)?.title || '').trim()
    const linkUrl = String((payload as any)?.linkUrl || '').trim()

    if (!title || !linkUrl) {
      return NextResponse.json(
        { error: 'Le titre et le lien de destination sont obligatoires.' },
        { status: 400 }
      )
    }

    const { data, error } = await getSupabaseAdmin()
      .from('dashboard_banners')
      .insert(mapBannerToDb({ ...(payload as any), title, linkUrl }))
      .select('*')
      .single()

    if (error) return failure(error)
    return NextResponse.json({ banner: mapBannerRow(data) }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST admin bannière:', error)
    return failure(error)
  }
}

/** PATCH /api/admin/banners — mise à jour partielle. Body: { id, ...champs }. */
export async function PATCH(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const payload = await request.json().catch(() => null)
    const id = (payload as any)?.id
    if (!id) {
      return NextResponse.json({ error: 'id manquant' }, { status: 400 })
    }

    const patch = mapBannerToDb(payload as any)
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('dashboard_banners')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return failure(error)
    return NextResponse.json({ banner: mapBannerRow(data) })
  } catch (error) {
    console.error('Erreur PATCH admin bannière:', error)
    return failure(error)
  }
}

/** DELETE /api/admin/banners?id=<uuid> */
export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id manquant' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from('dashboard_banners').delete().eq('id', id)
    if (error) return failure(error)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE admin bannière:', error)
    return failure(error)
  }
}
