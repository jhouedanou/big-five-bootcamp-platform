import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getStudyContent, getStudySlugs, type StudyContent } from '@/lib/studies'

/**
 * Lecture des études côté serveur : contenu éditorial en base (éditable depuis
 * /admin/etudes), avec repli sur les valeurs codées de lib/studies.ts.
 *
 * Ce repli n'est pas décoratif : il permet à la landing de fonctionner avant
 * l'exécution de la migration 14, et de survivre à une base injoignable.
 */

export interface StudyRecord {
  id: string
  slug: string
  title: string
  subtitle: string | null
  filePath: string | null
  isActive: boolean
  /** Contenu de page, fusionné base + défauts. */
  content: StudyContent
}

/** Ne garde que les entrées de la forme attendue — le jsonb n'est pas typé. */
function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  return items.length ? items : null
}

function asSlides(value: unknown): StudyContent['slides'] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .filter((v: any) => v && typeof v.src === 'string' && v.src.trim())
    .map((v: any) => ({ src: v.src, alt: typeof v.alt === 'string' ? v.alt : '' }))
  return items.length ? items : null
}

function asFaq(value: unknown): StudyContent['faq'] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .filter((v: any) => v && typeof v.question === 'string' && v.question.trim())
    .map((v: any) => ({
      question: v.question,
      answer: typeof v.answer === 'string' ? v.answer : '',
    }))
  return items.length ? items : null
}

function mergeContent(row: any, fallback: StudyContent | null): StudyContent {
  // Aucun défaut codé (nouvelle étude créée depuis l'admin) : on part d'une
  // coquille vide plutôt que d'échouer.
  const base: StudyContent = fallback || {
    slug: row.slug,
    eyebrow: 'Étude',
    title: row.title,
    subtitle: row.subtitle || '',
    description: '',
    ctaLabel: 'Télécharger l’étude',
    cover: { src: '', alt: row.title },
    slides: [],
    benefitsTitle: 'Avec ce guide, vous allez pouvoir :',
    benefits: [],
    faq: [],
    finalCtaText: '',
    metaDescription: '',
  }

  const coverSrc = row.cover_url || base.cover.src

  return {
    slug: row.slug,
    // title / subtitle viennent toujours de la base : ce sont les colonnes
    // canoniques, présentes dès la migration 12.
    title: row.title || base.title,
    subtitle: row.subtitle || base.subtitle,
    eyebrow: row.eyebrow || base.eyebrow,
    description: row.description || base.description,
    ctaLabel: row.cta_label || base.ctaLabel,
    cover: { src: coverSrc, alt: base.cover.alt || row.title },
    slides: asSlides(row.slides) || base.slides,
    benefitsTitle: row.benefits_title || base.benefitsTitle,
    benefits: asStringArray(row.benefits) || base.benefits,
    faq: asFaq(row.faq) || base.faq,
    finalCtaText: row.final_cta_text || base.finalCtaText,
    metaDescription: row.meta_description || base.metaDescription || base.description,
  }
}

/**
 * Une étude par slug. Retourne null si elle n'existe ni en base ni dans le code.
 * Une base injoignable ne fait pas disparaître la page : on sert les défauts.
 */
export async function getStudy(slug: string): Promise<StudyRecord | null> {
  const fallback = getStudyContent(slug)

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('studies')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error

    if (data) {
      const row = data as any
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle ?? null,
        filePath: row.file_path ?? null,
        isActive: row.is_active !== false,
        content: mergeContent(row, fallback),
      }
    }
  } catch (error: any) {
    console.error('Lecture studies échouée, repli sur le contenu codé:', error?.message || error)
  }

  if (!fallback) return null

  return {
    id: slug,
    slug,
    title: fallback.title,
    subtitle: fallback.subtitle,
    filePath: null,
    isActive: true,
    content: fallback,
  }
}

/**
 * Slugs à prérendre. Union base + code : une étude créée depuis l'admin doit
 * être servie même si elle n'existe pas dans lib/studies.ts.
 */
export async function getAllStudySlugs(): Promise<string[]> {
  const slugs = new Set(getStudySlugs())
  try {
    const { data } = await getSupabaseAdmin()
      .from('studies')
      .select('slug')
      .eq('is_active', true)
    for (const row of (data as any[]) || []) {
      if (row?.slug) slugs.add(row.slug)
    }
  } catch {
    /* base injoignable : les slugs codés suffisent */
  }
  return [...slugs]
}
