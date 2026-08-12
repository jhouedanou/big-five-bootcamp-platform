import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStudyContent, getStudySlugs } from '@/lib/studies'
import { StudyLandingClient } from './study-landing-client'

/**
 * Landing publique de téléchargement d'une étude.
 *
 * Contrairement au reste de l'application, cette page est publique ET
 * indexable : elle est la destination des bannières et des campagnes. Voir
 * middleware.ts — `/etudes` doit rester hors de la liste `noindex`.
 */

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://laveiye.com'
  ).replace(/\/$/, '')
}

export function generateStaticParams() {
  return getStudySlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const study = getStudyContent(slug)
  if (!study) return { title: 'Étude introuvable' }

  const title = `${study.title} — ${study.subtitle}`
  const url = `${siteUrl()}/etudes/${slug}`
  const image = `${siteUrl()}${study.cover.src}`

  return {
    title,
    description: study.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description: study.metaDescription,
      siteName: 'Big Five',
      locale: 'fr_FR',
      images: [{ url: image, alt: study.cover.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: study.metaDescription,
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
  const study = getStudyContent(slug)
  if (!study) notFound()

  return <StudyLandingClient study={study} />
}
