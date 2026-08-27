import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStudy, getAllStudySlugs } from '@/lib/studies-server'
import { StudyLandingClient } from './study-landing-client'
import { FbPageView } from '@/components/analytics/fb-events'

/**
 * Landing publique de téléchargement d'une étude.
 *
 * Contrairement au reste de l'application, cette page est publique ET
 * indexable : elle est la destination des bannières et des campagnes. Voir
 * middleware.ts — `/etudes` doit rester hors de la liste `noindex`.
 *
 * Le contenu vient de la table `studies` (éditable depuis /admin/etudes), avec
 * repli sur lib/studies.ts. Régénération périodique plutôt que rendu à chaque
 * requête : la page reste rapide et bien indexée, et une modification faite en
 * admin apparaît au plus tard cinq minutes après.
 */
export const revalidate = 300

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://laveiye.com'
  ).replace(/\/$/, '')
}

export async function generateStaticParams() {
  const slugs = await getAllStudySlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const study = await getStudy(slug)
  // Sans robots:noindex, une étude désactivée reste une URL indexable
  // au titre générique.
  if (!study) return { title: 'Étude introuvable', robots: { index: false, follow: false } }

  const { content } = study
  const title = content.subtitle ? `${content.title} — ${content.subtitle}` : content.title
  const url = `${siteUrl()}/etudes/${slug}`
  const image = content.cover.src.startsWith('http')
    ? content.cover.src
    : `${siteUrl()}${content.cover.src}`

  return {
    title,
    description: content.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description: content.metaDescription,
      siteName: 'Laveiye',
      locale: 'fr_FR',
      images: [{ url: image, alt: content.cover.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: content.metaDescription,
      images: [image],
    },
  }
}

export default async function StudyLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const study = await getStudy(slug)

  // Une étude désactivée depuis l'admin cesse d'être servie.
  if (!study || !study.isActive) notFound()

  return (
    <>
      {/* PageView Meta sur la principale page d'atterrissage publicitaire.
          `nativePixel` : cette page charge le pixel elle-même au lieu de le
          laisser au conteneur GTM — le brief complémentaire demande qu'il soit
          « également installé sur la landing page ». Elle n'émet donc jamais
          `meta_event`, ce qui rend tout doublon impossible. */}
      <FbPageView page={`etude:${slug}`} nativePixel />
      <StudyLandingClient study={study.content} />
    </>
  )
}
