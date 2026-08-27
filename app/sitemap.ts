import type { MetadataRoute } from "next"
import { getAllStudySlugs } from "@/lib/studies-server"
import { isNoIndexPath } from "@/lib/seo/robots-policy"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://laveiye.com").replace(/\/$/, "")

type SitemapEntry = MetadataRoute.Sitemap[number]

/**
 * Le sitemap lit la table `studies` : figé au build, il raterait toute étude
 * publiée depuis l'admin entre deux déploiements. `revalidate` serait sans
 * effet ici — open-next.config.ts ne déclare aucun incrementalCache et
 * wrangler.jsonc n'a ni KV ni R2, donc rien où écrire un cache incrémental.
 * Un sitemap n'est demandé que par les crawlers : le coût est négligeable.
 */
export const dynamic = "force-dynamic"

const staticRoutes: SitemapEntry[] = [
  {
    url: `${siteUrl}/`,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${siteUrl}/pricing`,
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: `${siteUrl}/decrypte`,
    changeFrequency: "weekly",
    priority: 0.85,
  },
  {
    url: `${siteUrl}/about`,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${siteUrl}/contact`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${siteUrl}/privacy`,
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${siteUrl}/terms`,
    changeFrequency: "yearly",
    priority: 0.3,
  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // getAllStudySlugs fusionne les slugs codés et ceux de la table `studies` :
  // getStudySlugs() ne renvoyait que `finance`, et les études créées depuis
  // l'admin restaient invisibles des crawlers.
  const studySlugs = await getAllStudySlugs()

  const entries: SitemapEntry[] = [
    ...staticRoutes,
    ...studySlugs.map((slug) => ({
      url: `${siteUrl}/etudes/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
  ]

  // Filet de sécurité : une route qui deviendrait noindex sort d'elle-même
  // du sitemap, sans qu'on ait à y penser ici.
  const indexable = entries.filter((entry) => !isNoIndexPath(new URL(entry.url).pathname))

  if (indexable.length !== entries.length) {
    console.warn(
      `[sitemap] ${entries.length - indexable.length} URL noindex écartée(s) du sitemap`,
    )
  }

  return indexable
}
