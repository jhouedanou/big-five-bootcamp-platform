import type { MetadataRoute } from "next"
import { getSupabaseAdmin } from "@/lib/supabase"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://laveiye.com").replace(/\/$/, "")

type SitemapEntry = MetadataRoute.Sitemap[number]

const staticRoutes: SitemapEntry[] = [
  {
    url: `${siteUrl}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${siteUrl}/pricing`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    url: `${siteUrl}/about`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${siteUrl}/contact`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.6,
  },
  {
    url: `${siteUrl}/privacy`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${siteUrl}/terms`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.3,
  },
]

async function getPublishedCampaignUrls(): Promise<SitemapEntry[]> {
  try {
    const supabase = getSupabaseAdmin() as any
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, slug, created_at, campaign_date")
      .in("status", ["Publié", "PubliÃ©"])
      .order("created_at", { ascending: false })
      .limit(5000)

    if (error || !data) return []

    return data
      .map((campaign: any) => {
        const slugOrId = campaign.slug || campaign.id
        if (!slugOrId) return null

        return {
          url: `${siteUrl}/content/${slugOrId}`,
          lastModified: campaign.campaign_date || campaign.created_at || new Date(),
          changeFrequency: "weekly",
          priority: 0.65,
        } satisfies SitemapEntry
      })
      .filter(Boolean) as SitemapEntry[]
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campaignUrls = await getPublishedCampaignUrls()
  return [...staticRoutes, ...campaignUrls]
}
