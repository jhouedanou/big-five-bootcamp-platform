import type { MetadataRoute } from "next"
import { getSupabaseAdmin } from "@/lib/supabase"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://laveiye.com").replace(/\/$/, "")

type SitemapEntry = MetadataRoute.Sitemap[number]

/**
 * Sans cette directive, la route est évaluée au build et FIGÉE : toute
 * campagne publiée entre deux déploiements n'entrait jamais dans le sitemap.
 * `revalidate` serait sans effet — aucun cache incrémental n'est configuré
 * (open-next.config.ts vide, ni KV ni R2 dans wrangler.jsonc). Seuls les
 * crawlers demandent ce fichier : le coût par requête est négligeable.
 */
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseAdmin() as any
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, slug, created_at, campaign_date")
    .in("status", ["Publié", "PubliÃ©"])
    .order("created_at", { ascending: false })
    .limit(5000)

  // Ne PLUS avaler l'erreur : un sitemap vide servi en 200 dit à Google que
  // le site a perdu toutes ses pages. Un 500 le fait simplement réessayer,
  // sans rien désindexer.
  if (error) {
    console.error("[content/sitemap] lecture campaigns échouée", error)
    throw new Error("content sitemap: lecture Supabase échouée")
  }

  return (data || [])
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
}
