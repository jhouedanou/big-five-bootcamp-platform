import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import ContentDetailClient from "./content-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("title, description, thumbnail, brand, category")
      .eq("id", id)
      .single();

    if (!campaign) {
      return {
        title: "Campagne introuvable | Big Five Creative Library",
      };
    }

    const description = campaign.description
      ? stripHtml(campaign.description).slice(0, 160)
      : `${campaign.brand || ""} ${campaign.category ? `- ${campaign.category}` : ""} | Découvrez cette campagne créative`.trim();

    const title = `${campaign.title} | Big Five Creative Library`;

    return {
      title,
      description,
      openGraph: {
        title: campaign.title,
        description,
        type: "article",
        ...(campaign.thumbnail && {
          images: [
            {
              url: campaign.thumbnail,
              width: 1200,
              height: 630,
              alt: campaign.title,
            },
          ],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title: campaign.title,
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
  return <ContentDetailClient id={id} />;
}
