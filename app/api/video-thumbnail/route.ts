import { NextRequest, NextResponse } from "next/server";
import { detectVideoPlatform, getYouTubeThumbnail } from "@/lib/video-utils";

/**
 * GET /api/video-thumbnail?url=VIDEO_URL
 * 
 * Récupère la thumbnail d'une vidéo depuis les réseaux sociaux.
 * Stratégies utilisées:
 * - YouTube: URL directe de l'API img.youtube.com
 * - Facebook: oEmbed API
 * - Twitter/X: oEmbed API (publish.twitter.com)
 * - LinkedIn: OpenGraph meta tags scraping
 * - Fallback: OpenGraph parsing pour tout URL
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL manquante" }, { status: 400 });
  }

  try {
    const platform = detectVideoPlatform(url);
    let thumbnailUrl: string | null = null;

    switch (platform) {
      case "youtube":
        thumbnailUrl = getYouTubeThumbnail(url);
        break;

      case "facebook":
        thumbnailUrl = await getFacebookThumbnail(url);
        break;

      case "twitter":
        thumbnailUrl = await getTwitterThumbnail(url);
        break;

      case "linkedin":
        thumbnailUrl = await getOpenGraphThumbnail(url);
        break;

      default:
        // Fallback: essayer OpenGraph pour tout URL inconnu
        thumbnailUrl = await getOpenGraphThumbnail(url);
        break;
    }

    return NextResponse.json({
      thumbnailUrl,
      platform,
      success: !!thumbnailUrl,
    });
  } catch (error: any) {
    console.error("Erreur extraction thumbnail:", error);
    return NextResponse.json(
      { error: error.message, thumbnailUrl: null, success: false },
      { status: 200 } // Retourner 200 même en cas d'erreur pour ne pas bloquer l'admin
    );
  }
}

/**
 * Récupère la thumbnail Facebook via oEmbed
 */
async function getFacebookThumbnail(url: string): Promise<string | null> {
  try {
    // Essayer d'abord l'API oEmbed publique de Facebook
    const oembedUrl = `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BigFiveBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.thumbnail_url) return data.thumbnail_url;
    }

    // Fallback: scraper les meta OpenGraph
    return await getOpenGraphThumbnail(url);
  } catch {
    return await getOpenGraphThumbnail(url);
  }
}

/**
 * Récupère la thumbnail Twitter/X via oEmbed
 */
async function getTwitterThumbnail(url: string): Promise<string | null> {
  try {
    // Normaliser l'URL twitter.com / x.com
    const normalizedUrl = url.replace("x.com", "twitter.com");
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}`;

    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BigFiveBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const data = await response.json();
      // L'API oEmbed Twitter retourne du HTML, on cherche l'image dedans
      if (data.html) {
        const imgMatch = data.html.match(/src="(https:\/\/pbs\.twimg\.com\/[^"]+)"/);
        if (imgMatch) return imgMatch[1];
      }
    }

    // Fallback: OpenGraph
    return await getOpenGraphThumbnail(url);
  } catch {
    return await getOpenGraphThumbnail(url);
  }
}

/**
 * Récupère la thumbnail via les meta tags OpenGraph (og:image)
 * Fonctionne pour la plupart des sites web
 */
async function getOpenGraphThumbnail(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Chercher og:image
    const ogImageMatch = html.match(
      /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i
    );
    if (ogImageMatch) return ogImageMatch[1];

    // Chercher l'attribut dans l'autre sens (content avant property)
    const ogImageMatch2 = html.match(
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i
    );
    if (ogImageMatch2) return ogImageMatch2[1];

    // Chercher twitter:image
    const twitterImageMatch = html.match(
      /<meta\s+(?:property|name)=["']twitter:image(?::src)?["']\s+content=["']([^"']+)["']/i
    );
    if (twitterImageMatch) return twitterImageMatch[1];

    // Chercher twitter:image dans l'autre sens
    const twitterImageMatch2 = html.match(
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image(?::src)?["']/i
    );
    if (twitterImageMatch2) return twitterImageMatch2[1];

    return null;
  } catch {
    return null;
  }
}
