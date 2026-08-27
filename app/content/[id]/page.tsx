import type { Metadata } from "next";
import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import ContentDetailClient from "./content-detail-client";
import { permanentRedirect } from "next/navigation";
import { fixBrokenEncoding, getGoogleDriveImageUrl } from "@/lib/utils";
import { buildCampaignDescription, buildCampaignTitle } from "@/lib/seo/campaign-meta";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Détecte si la valeur est un UUID (v4) ou un slug
 */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isPublished(status: string | null | undefined): boolean {
  return status === "Publié" || status === "PubliÃ©";
}

/**
 * Récupère une campagne par slug ou par UUID, avec timeout pour éviter
 * que la page ne bloque indéfiniment si Supabase ne répond pas.
 *
 * Mémorisé par `cache()` : `generateMetadata` et le composant de page
 * demandaient chacun le même enregistrement, soit deux requêtes et deux
 * timers de 5 s par visite d'une URL en UUID.
 */
const getCampaignByIdOrSlug = cache(async (idOrSlug: string, timeoutMs = 5000) => {
  const supabase = getSupabaseAdmin();

  const query = isUUID(idOrSlug)
    ? supabase.from("campaigns").select("*").eq("id", idOrSlug).single()
    : supabase.from("campaigns").select("*").eq("slug", idOrSlug).single();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Supabase query timeout")), timeoutMs);
  });

  try {
    const { data } = await Promise.race([query, timeout]);
    return data;
  } finally {
    // Sans ce clearTimeout, le worker reste éveillé 5 s après chaque réponse.
    clearTimeout(timer);
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  let campaign: any = null;
  try {
    campaign = await getCampaignByIdOrSlug(id);
  } catch {
    // Un timeout Supabase ne doit jamais produire une page indexable au titre
    // générique : l'ancien repli `{ title: "Laveiye" }` en fabriquait autant
    // que de requêtes lentes.
    return {
      title: { absolute: "Campagne indisponible | Laveiye" },
      robots: { index: false, follow: false },
    };
  }

  if (!campaign || !isPublished(campaign.status)) {
    return {
      title: { absolute: "Campagne introuvable | Laveiye" },
      robots: { index: false, follow: false },
    };
  }

  const title = buildCampaignTitle(campaign);
  const description = buildCampaignDescription(campaign);
  const socialTitle = fixBrokenEncoding(campaign.title) || title;

  // URL canonique avec le slug pour le SEO
  const canonicalSlug = campaign.slug || campaign.id;

  // Les vignettes sont souvent des liens Drive « /file/d/…/view », illisibles
  // par les scrapers Open Graph.
  const image = campaign.thumbnail ? getGoogleDriveImageUrl(campaign.thumbnail) : null;

  return {
    // `absolute` : le titre porte déjà « | Laveiye », le template du layout
    // racine ne doit pas en ajouter un second.
    title: { absolute: title },
    description,
    alternates: {
      canonical: `/content/${canonicalSlug}`,
    },
    openGraph: {
      title: socialTitle,
      description,
      type: "article",
      siteName: "Laveiye",
      locale: "fr_FR",
      url: `/content/${canonicalSlug}`,
      ...(campaign.campaign_date || campaign.created_at
        ? { publishedTime: campaign.campaign_date || campaign.created_at }
        : {}),
      ...(image && {
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: socialTitle,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Si c'est un UUID et que la campagne a un slug, consolider vers l'URL slug.
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
    // Hors du try/catch : permanentRedirect lève une exception de contrôle,
    // qui serait avalée par le catch ci-dessus. 308 (et non le 307 de
    // `redirect`) pour que Google transfère le signal vers le slug.
    if (slugRedirect) {
      permanentRedirect(`/content/${slugRedirect}`);
    }
  }

  return <ContentDetailClient id={id} />;
}
