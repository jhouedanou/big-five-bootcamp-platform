/**
 * GET /api/rss/brand/[name]
 *
 * Génère un flux RSS 2.0 des dernières campagnes publiées pour une marque donnée.
 * Accessible publiquement (pas d'auth requise — contenu déjà public dans le dashboard).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function escapeXml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const brandName = decodeURIComponent(params.name || '').trim()
  if (!brandName) {
    return new NextResponse('Brand name required', { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: campaigns, error } = await admin
    .from('campaigns')
    .select('id, title, summary, description, brand, category, country, platforms, created_at, publication_url, thumbnail')
    .ilike('brand', brandName)
    .eq('status', 'Publié')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return new NextResponse('Internal error', { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://laveiye.com'
  const feedUrl = `${siteUrl}/api/rss/brand/${encodeURIComponent(brandName)}`
  const now = new Date().toUTCString()

  const items = (campaigns || []).map((c: any) => {
    const title = escapeXml(c.title || c.brand)
    const link = c.publication_url
      ? escapeXml(c.publication_url)
      : escapeXml(`${siteUrl}/dashboard?brand=${encodeURIComponent(brandName)}`)
    const description = escapeXml(c.summary || c.description || '')
    const pubDate = new Date(c.created_at).toUTCString()
    const image = c.thumbnail ? `<enclosure url="${escapeXml(c.thumbnail)}" type="image/jpeg" length="0" />` : ''
    const category = c.category ? `<category>${escapeXml(c.category)}</category>` : ''
    const country = c.country ? `<laveiye:country>${escapeXml(c.country)}</laveiye:country>` : ''
    const platforms = Array.isArray(c.platforms) && c.platforms.length > 0
      ? `<laveiye:platforms>${escapeXml(c.platforms.join(', '))}</laveiye:platforms>`
      : ''

    return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${escapeXml(c.id)}</guid>
      ${category}
      ${country}
      ${platforms}
      ${image}
    </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:laveiye="https://laveiye.com/ns/1.0">
  <channel>
    <title>${escapeXml(brandName)} — Campagnes LAVEIYE</title>
    <link>${escapeXml(`${siteUrl}/dashboard?brand=${encodeURIComponent(brandName)}`)}</link>
    <description>Dernières campagnes suivies pour ${escapeXml(brandName)} sur LAVEIYE</description>
    <language>fr</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  })
}
