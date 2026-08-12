import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkAdmin } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PG_UNDEFINED_TABLE = '42P01'
const PG_UNDEFINED_COLUMN = '42703'
const PG_UNIQUE_VIOLATION = '23505'

function failure(error: any) {
  if (error?.code === PG_UNDEFINED_TABLE) {
    return NextResponse.json(
      { error: 'Table studies absente. Exécutez la migration 12_20260812_studies.sql.' },
      { status: 503 }
    )
  }
  if (error?.code === PG_UNDEFINED_COLUMN) {
    return NextResponse.json(
      {
        error:
          'Colonnes de contenu absentes. Exécutez la migration 14_20260812_studies_content.sql.',
      },
      { status: 503 }
    )
  }
  if (error?.code === PG_UNIQUE_VIOLATION) {
    return NextResponse.json({ error: 'Ce slug est déjà utilisé.' }, { status: 409 })
  }
  return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 })
}

/** Champs éditables → colonnes. Tout le reste du payload est ignoré. */
function toDb(input: any): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  const text = (key: string, column: string) => {
    if (input[key] !== undefined) record[column] = input[key] || null
  }

  if (input.slug !== undefined) {
    record.slug = String(input.slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  }
  if (input.title !== undefined) record.title = String(input.title).trim()
  if (input.isActive !== undefined) record.is_active = !!input.isActive

  text('subtitle', 'subtitle')
  text('eyebrow', 'eyebrow')
  text('description', 'description')
  text('ctaLabel', 'cta_label')
  text('coverUrl', 'cover_url')
  text('benefitsTitle', 'benefits_title')
  text('finalCtaText', 'final_cta_text')
  text('metaDescription', 'meta_description')
  text('filePath', 'file_path')

  // Listes : on ne fait confiance qu'à des tableaux, la contrainte CHECK en base
  // refuserait un scalaire de toute façon.
  if (Array.isArray(input.slides)) {
    record.slides = input.slides
      .filter((s: any) => s && typeof s.src === 'string' && s.src.trim())
      .map((s: any) => ({ src: s.src.trim(), alt: String(s.alt || '').trim() }))
  }
  if (Array.isArray(input.benefits)) {
    record.benefits = input.benefits
      .map((b: any) => String(b || '').trim())
      .filter(Boolean)
  }
  if (Array.isArray(input.faq)) {
    record.faq = input.faq
      .filter((f: any) => f && String(f.question || '').trim())
      .map((f: any) => ({
        question: String(f.question).trim(),
        answer: String(f.answer || '').trim(),
      }))
  }

  return record
}

/** Purge le cache de la landing pour que l'édition soit visible tout de suite. */
function revalidateStudy(slug?: string) {
  try {
    if (slug) revalidatePath(`/etudes/${slug}`)
    revalidatePath('/sitemap.xml')
  } catch (error) {
    console.error('Revalidation étude échouée:', error)
  }
}

/** GET /api/admin/studies */
export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('studies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return failure(error)
    return NextResponse.json({ studies: data || [] })
  } catch (error) {
    console.error('Erreur GET admin studies:', error)
    return failure(error)
  }
}

/** POST /api/admin/studies — création. */
export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const payload = await request.json().catch(() => null)
    const record = toDb(payload || {})

    if (!record.title || !record.slug) {
      return NextResponse.json(
        { error: "Le titre et l'identifiant d'URL (slug) sont obligatoires." },
        { status: 400 }
      )
    }

    const { data, error } = await getSupabaseAdmin()
      .from('studies')
      .insert(record)
      .select('*')
      .single()

    if (error) return failure(error)

    revalidateStudy((data as any)?.slug)
    return NextResponse.json({ study: data }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST admin study:', error)
    return failure(error)
  }
}

/** PATCH /api/admin/studies — mise à jour partielle. Body: { id, ...champs }. */
export async function PATCH(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const payload = await request.json().catch(() => null)
    const id = (payload as any)?.id
    if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

    const record = toDb(payload)
    if (Object.keys(record).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('studies')
      .update(record)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return failure(error)

    revalidateStudy((data as any)?.slug)
    return NextResponse.json({ study: data })
  } catch (error) {
    console.error('Erreur PATCH admin study:', error)
    return failure(error)
  }
}

/**
 * DELETE /api/admin/studies?id=<uuid>
 * Supprime aussi les leads associés (cascade en base) — d'où la confirmation
 * explicite exigée côté interface.
 */
export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

    const admin = getSupabaseAdmin()
    const { data: study } = await admin.from('studies').select('slug').eq('id', id).maybeSingle()

    const { error } = await admin.from('studies').delete().eq('id', id)
    if (error) return failure(error)

    revalidateStudy((study as any)?.slug)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE admin study:', error)
    return failure(error)
  }
}
