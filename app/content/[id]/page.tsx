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
 * Récupère une campagne par slug ou par UUID
 */
async function getCampaignByIdOrSlug(idOrSlug: string) {
  const supabase = getSupabaseAdmin();

  if (isUUID(idOrSlug)) {
    // Chercher par UUID
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", idOrSlug)
      .single();
    return data;
  } else {
    // Chercher par slug
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("slug", idOrSlug)
      .single();
    return data;
  }
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
    try {
      const campaign = await getCampaignByIdOrSlug(id);
      if (campaign?.slug) {
        redirect(`/content/${campaign.slug}`);
      }
    } catch (error: any) {
      // redirect() lance une erreur NEXT_REDIRECT, il faut la propager
      if (error?.digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      // Sinon, continuer avec l'UUID
    }
  }

  return <ContentDetailClient id={id} />;
}