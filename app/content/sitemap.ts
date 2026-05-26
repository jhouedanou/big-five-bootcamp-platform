import type { MetadataRoute } from "next"
import { getSupabaseAdmin } from "@/lib/supabase"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://laveiye.com").replace(/\/$/, "")

type SitemapEntry = MetadataRoute.Sitemap[number]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
          changeFrequency: "monthly",
          priority: 0.8,
        } satisfies SitemapEntry
      })
      .filter(Boolean) as SitemapEntry[]
  } catch {
    return []
  }
}