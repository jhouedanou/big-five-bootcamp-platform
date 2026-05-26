import type { MetadataRoute } from "next"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://laveiye.com").replace(/\/$/, "")

type SitemapEntry = MetadataRoute.Sitemap[number]

const staticRoutes: SitemapEntry[] = [
  {
    url: `${siteUrl}/`,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${siteUrl}/library`,
    changeFrequency: "daily",
    priority: 0.95,
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
    url: `${siteUrl}/keynote`,
    changeFrequency: "weekly",
    priority: 0.85,
  },
  {
    url: `${siteUrl}/temps-forts`,
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    url: `${siteUrl}/community`,
    changeFrequency: "weekly",
    priority: 0.75,
  },
  {
    url: `${siteUrl}/demo`,
    changeFrequency: "monthly",
    priority: 0.7,
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
  return staticRoutes
}
