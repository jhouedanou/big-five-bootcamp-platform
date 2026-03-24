import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import ContentDetailClient from "./content-detail-client";
import { redirect } from "next/navigation";
import { fixBrokenEncoding } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Détecte si la valeur est un UUID (v4) ou un slug
 */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Récupère une campagne par slug ou par UUID, avec timeout pour éviter
 * que la page ne bloque indéfiniment si Supabase ne répond pas.
 */
async function getCampaignByIdOrSlug(idOrSlug: string, timeoutMs = 5000) {
  const supabase = getSupabaseAdmin();

  const query = isUUID(idOrSlug)
    ? supabase.from("campaigns").select("*").eq("id", idOrSlug).single()
    : supabase.from("campaigns").select("*").eq("slug", idOrSlug).single();

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Supabase query timeout")), timeoutMs)
  );

  const { data } = await Promise.race([query, timeout]);
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const campaign = await getCampaignByIdOrSlug(id);

    if (!campaign) {
      return {
        title: "Campagne introuvable | Big Five Creative Library",
      };
    }

    const description = campaign.description
      ? stripHtml(fixBrokenEncoding(campaign.description)).slice(0, 160)
      : `${fixBrokenEncoding(campaign.brand) || ""} ${campaign.category ? `- ${fixBrokenEncoding(campaign.category)}` : ""} | Découvrez cette campagne créative`.trim();

    const title = `${fixBrokenEncoding(campaign.title)} | Big Five Creative Library`;

    // URL canonique avec le slug pour le SEO
    const canonicalSlug = campaign.slug || campaign.id;

    return {
      title,
      description,
      alternates: {
        canonical: `/content/${canonicalSlug}`,
      },
      openGraph: {
        title: fixBrokenEncoding(campaign.title),
        description,
        type: "article",
        url: `/content/${canonicalSlug}`,
        ...(campaign.thumbnail && {
          images: [
            {
              url: campaign.thumbnail,
              width: 1200,
              height: 630,
              alt: fixBrokenEncoding(campaign.title),
            },
          ],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title: fixBrokenEncoding(campaign.title),
        description,
        ...(campaign.thumbnail && { images: [campaign.thumbnail] }),
      },
    };
  } catch {
    return {
      title: "Big Five Creative Library",
    };
  }
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Si c'est un UUID et que la campagne a un slug, rediriger vers l'URL avec slug (301)
  if (isUUID(id)) {
    let slugRedirect: string | null = null;
    try {
      const campaign = await getCampaignByIdOrSlug(id);
      if (campaign?.slug) {
        slugRedirect = campaign.slug;
      }
    } catch {
      // Timeout ou erreur Supabase, continuer avec l'UUID
    }
    if (slugRedirect) {
      redirect(`/content/${slugRedirect}`);
    }
  }

  return <ContentDetailClient id={id} />;
}