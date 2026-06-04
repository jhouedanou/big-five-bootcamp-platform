import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getWebinarBySlug } from "@/lib/webinars-server"
import { PreviewView } from "@/components/webinars/PreviewView"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const webinar = await getWebinarBySlug(slug)
  if (!webinar) return { title: "Webinaire | Laveiye" }
  return {
    title: `${webinar.title} | #BigFiveDécrypte`,
    description: webinar.short_description || undefined,
    openGraph: {
      title: webinar.title,
      description: webinar.short_description || undefined,
    },
  }
}

/** Aperçu public partageable (réseaux sociaux, email, WhatsApp). */
export default async function WebinarPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const webinar = await getWebinarBySlug(slug)

  // Visible seulement si publié et aperçu public activé.
  if (!webinar || webinar.status !== "published" || !webinar.public_preview_enabled) {
    notFound()
  }

  return (
    <PreviewView
      webinar={{
        id: webinar.id,
        slug: webinar.slug,
        title: webinar.title,
        short_description: webinar.short_description,
        date: webinar.date,
        start_time: webinar.start_time,
        end_time: webinar.end_time,
        timezone: webinar.timezone,
        speaker_name: webinar.speaker_name,
      }}
    />
  )
}
