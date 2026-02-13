/**
 * Utilitaires pour la gestion des vidéos multi-plateforme
 * Supporte: YouTube, Facebook, LinkedIn, Twitter/X, Instagram, TikTok
 */

export type VideoPlatform = "youtube" | "facebook" | "linkedin" | "twitter" | "instagram" | "tiktok" | "unknown";

export interface VideoInfo {
  platform: VideoPlatform;
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string | null;
  originalUrl: string;
}

/**
 * Détecte la plateforme d'une URL vidéo
 */
export function detectVideoPlatform(url: string): VideoPlatform {
  if (!url) return "unknown";
  const u = url.toLowerCase();

  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("twitter.com") || u.includes("x.com") || u.includes("t.co")) return "twitter";

  return "unknown";
}

/**
 * Extrait l'ID vidéo YouTube depuis une URL
 */
function extractYouTubeId(url: string): string {
  // youtube.com/embed/VIDEO_ID (déjà en format embed)
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/v/VIDEO_ID
  const vMatch = url.match(/youtube\.com\/v\/([^?&]+)/);
  if (vMatch) return vMatch[1];

  return "";
}

/**
 * Extrait l'ID vidéo Facebook depuis une URL
 * Formats supportés:
 * - facebook.com/watch/?v=VIDEO_ID
 * - facebook.com/watch?v=VIDEO_ID
 * - facebook.com/PAGE/videos/VIDEO_ID
 * - facebook.com/reel/VIDEO_ID
 * - fb.watch/XXXX
 * - facebook.com/plugins/video.php?href=... (déjà embed — on extrait l'original)
 */
function extractFacebookVideoId(url: string): string {
  // Si c'est une URL embed plugins/video.php, extraire l'URL originale d'abord
  const originalUrl = extractOriginalFacebookUrl(url);
  const u = originalUrl || url;

  // facebook.com/watch/?v=VIDEO_ID ou facebook.com/watch?v=VIDEO_ID
  const watchMatch = u.match(/facebook\.com\/watch\/?\?v=(\d+)/);
  if (watchMatch) return watchMatch[1];

  // facebook.com/PAGE/videos/VIDEO_ID
  const videosMatch = u.match(/facebook\.com\/[^/]+\/videos\/(\d+)/);
  if (videosMatch) return videosMatch[1];

  // facebook.com/reel/VIDEO_ID
  const reelMatch = u.match(/facebook\.com\/reel\/(\d+)/);
  if (reelMatch) return reelMatch[1];

  // facebook.com/video.php?v=VIDEO_ID
  const phpMatch = u.match(/video\.php\?v=(\d+)/);
  if (phpMatch) return phpMatch[1];

  return "";
}

/**
 * Si l'URL est déjà un embed Facebook (plugins/video.php?href=...),
 * extrait l'URL originale de la vidéo
 */
function extractOriginalFacebookUrl(url: string): string | null {
  if (!url.includes("plugins/video.php")) return null;
  
  const hrefMatch = url.match(/[?&]href=([^&]+)/);
  if (hrefMatch) {
    try {
      return decodeURIComponent(hrefMatch[1]);
    } catch {
      return hrefMatch[1];
    }
  }
  return null;
}

/**
 * Extrait l'ID du post Twitter/X
 * Format: twitter.com/USER/status/TWEET_ID ou x.com/USER/status/TWEET_ID
 */
function extractTwitterId(url: string): string {
  const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : "";
}

/**
 * Extrait l'info du post LinkedIn
 * Format: linkedin.com/posts/xxx-xxx ou linkedin.com/feed/update/urn:li:activity:xxx
 */
function extractLinkedInId(url: string): string {
  // linkedin.com/feed/update/urn:li:activity:ID
  const activityMatch = url.match(/urn:li:activity:(\d+)/);
  if (activityMatch) return activityMatch[1];

  // linkedin.com/posts/SLUG
  const postsMatch = url.match(/linkedin\.com\/posts\/([^/?]+)/);
  if (postsMatch) return postsMatch[1];

  // linkedin.com/feed/update/urn:li:ugcPost:ID
  const ugcMatch = url.match(/urn:li:ugcPost:(\d+)/);
  if (ugcMatch) return ugcMatch[1];

  return "";
}

/**
 * Récupère l'URL originale d'une vidéo à partir d'une URL potentiellement déjà embed.
 * Si l'URL n'est pas un embed, la retourne telle quelle.
 */
export function getOriginalVideoUrl(url: string): string {
  if (!url) return "";

  // YouTube embed → URL watch standard
  const ytEmbedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (ytEmbedMatch) return `https://www.youtube.com/watch?v=${ytEmbedMatch[1]}`;

  // Facebook embed → URL originale
  const fbOriginal = extractOriginalFacebookUrl(url);
  if (fbOriginal) return fbOriginal;

  // Twitter embed → URL originale
  const twEmbedMatch = url.match(/platform\.twitter\.com\/embed\/Tweet\.html\?id=(\d+)/);
  if (twEmbedMatch) return `https://twitter.com/i/status/${twEmbedMatch[1]}`;

  return url;
}

/**
 * Génère l'URL d'embed pour une vidéo.
 * Gère les cas où l'URL est déjà convertie en embed (ne double-encode pas).
 */
export function getEmbedUrl(url: string): string {
  if (!url) return "";

  // D'abord récupérer l'URL originale si c'est déjà un embed
  const originalUrl = getOriginalVideoUrl(url);
  const platform = detectVideoPlatform(originalUrl);

  switch (platform) {
    case "youtube": {
      const id = extractYouTubeId(originalUrl);
      return id ? `https://www.youtube.com/embed/${id}` : originalUrl;
    }
    case "facebook": {
      const videoId = extractFacebookVideoId(originalUrl);
      if (videoId) {
        // Utiliser le format d'embed direct par ID — plus fiable que plugins/video.php
        return `https://www.facebook.com/video/embed?video_id=${videoId}`;
      }
      // Fallback: plugins/video.php avec l'URL originale
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(originalUrl)}&show_text=false&width=560&appId`;
    }
    case "twitter": {
      const tweetId = extractTwitterId(originalUrl);
      if (tweetId) {
        return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`;
      }
      return originalUrl;
    }
    case "linkedin": {
      return originalUrl;
    }
    default:
      return originalUrl;
  }
}

/**
 * Génère l'URL de la thumbnail pour une vidéo YouTube (synchrone)
 */
export function getYouTubeThumbnail(url: string): string | null {
  const originalUrl = getOriginalVideoUrl(url);
  const id = extractYouTubeId(originalUrl);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

/**
 * Analyse une URL vidéo et retourne toutes les infos
 */
export function parseVideoUrl(url: string): VideoInfo {
  const originalUrl = getOriginalVideoUrl(url);
  const platform = detectVideoPlatform(originalUrl);

  let videoId = "";
  let embedUrl = originalUrl;
  let thumbnailUrl: string | null = null;

  switch (platform) {
    case "youtube":
      videoId = extractYouTubeId(originalUrl);
      embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : originalUrl;
      thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
      break;
    case "facebook":
      videoId = extractFacebookVideoId(originalUrl);
      if (videoId) {
        embedUrl = `https://www.facebook.com/video/embed?video_id=${videoId}`;
      } else {
        embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(originalUrl)}&show_text=false&width=560&appId`;
      }
      thumbnailUrl = null;
      break;
    case "twitter":
      videoId = extractTwitterId(originalUrl);
      embedUrl = videoId ? `https://platform.twitter.com/embed/Tweet.html?id=${videoId}` : originalUrl;
      thumbnailUrl = null;
      break;
    case "linkedin":
      videoId = extractLinkedInId(originalUrl);
      embedUrl = originalUrl;
      thumbnailUrl = null;
      break;
  }

  return {
    platform,
    videoId,
    embedUrl,
    thumbnailUrl,
    originalUrl,
  };
}

/**
 * Vérifie si une URL est une vidéo supportée
 */
export function isSupportedVideoUrl(url: string): boolean {
  const originalUrl = getOriginalVideoUrl(url);
  return detectVideoPlatform(originalUrl) !== "unknown";
}

/**
 * Retourne le label humain de la plateforme vidéo
 */
export function getVideoPlatformLabel(platform: VideoPlatform): string {
  const labels: Record<VideoPlatform, string> = {
    youtube: "YouTube",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    twitter: "Twitter/X",
    unknown: "Vidéo",
  };
  return labels[platform];
}
