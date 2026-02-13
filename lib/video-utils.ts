/**
 * Utilitaires pour la gestion des vidéos multi-plateforme
 * Supporte: YouTube, Facebook, LinkedIn, Twitter/X
 */

export type VideoPlatform = "youtube" | "facebook" | "linkedin" | "twitter" | "unknown";

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
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("twitter.com") || u.includes("x.com") || u.includes("t.co")) return "twitter";

  return "unknown";
}

/**
 * Extrait l'ID vidéo YouTube depuis une URL
 */
function extractYouTubeId(url: string): string {
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/v/VIDEO_ID
  const vMatch = url.match(/youtube\.com\/v\/([^?&]+)/);
  if (vMatch) return vMatch[1];

  return "";
}

/**
 * Extrait l'ID vidéo Facebook depuis une URL
 * Formats supportés:
 * - facebook.com/watch/?v=VIDEO_ID
 * - facebook.com/PAGE/videos/VIDEO_ID
 * - facebook.com/reel/VIDEO_ID
 * - fb.watch/XXXX
 */
function extractFacebookVideoId(url: string): string {
  // facebook.com/watch/?v=VIDEO_ID
  const watchMatch = url.match(/facebook\.com\/watch\/?\?v=(\d+)/);
  if (watchMatch) return watchMatch[1];

  // facebook.com/PAGE/videos/VIDEO_ID
  const videosMatch = url.match(/facebook\.com\/[^/]+\/videos\/(\d+)/);
  if (videosMatch) return videosMatch[1];

  // facebook.com/reel/VIDEO_ID
  const reelMatch = url.match(/facebook\.com\/reel\/(\d+)/);
  if (reelMatch) return reelMatch[1];

  // facebook.com/video.php?v=VIDEO_ID
  const phpMatch = url.match(/video\.php\?v=(\d+)/);
  if (phpMatch) return phpMatch[1];

  return "";
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
 * Génère l'URL d'embed pour une vidéo
 */
export function getEmbedUrl(url: string): string {
  if (!url) return "";

  const platform = detectVideoPlatform(url);

  switch (platform) {
    case "youtube": {
      const id = extractYouTubeId(url);
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    case "facebook": {
      // Facebook utilise le plugin embed
      const encodedUrl = encodeURIComponent(url);
      return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=560`;
    }
    case "twitter": {
      // Twitter n'a pas d'embed iframe simple pour les vidéos,
      // on utilise le tweet embed via publish.twitter.com
      const tweetId = extractTwitterId(url);
      if (tweetId) {
        return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`;
      }
      return url;
    }
    case "linkedin": {
      // LinkedIn n'a pas d'embed iframe public simple,
      // on redirige vers l'URL originale
      return url;
    }
    default:
      return url;
  }
}

/**
 * Génère l'URL de la thumbnail pour une vidéo YouTube (synchrone)
 */
export function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  // maxresdefault est la meilleure qualité, avec fallback sur hqdefault
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

/**
 * Analyse une URL vidéo et retourne toutes les infos
 */
export function parseVideoUrl(url: string): VideoInfo {
  const platform = detectVideoPlatform(url);

  let videoId = "";
  let embedUrl = url;
  let thumbnailUrl: string | null = null;

  switch (platform) {
    case "youtube":
      videoId = extractYouTubeId(url);
      embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
      break;
    case "facebook":
      videoId = extractFacebookVideoId(url);
      embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`;
      // Thumbnail sera récupérée via l'API côté serveur
      thumbnailUrl = null;
      break;
    case "twitter":
      videoId = extractTwitterId(url);
      embedUrl = videoId ? `https://platform.twitter.com/embed/Tweet.html?id=${videoId}` : url;
      thumbnailUrl = null;
      break;
    case "linkedin":
      videoId = extractLinkedInId(url);
      embedUrl = url; // LinkedIn n'a pas d'embed iframe standard
      thumbnailUrl = null;
      break;
  }

  return {
    platform,
    videoId,
    embedUrl,
    thumbnailUrl,
    originalUrl: url,
  };
}

/**
 * Vérifie si une URL est une vidéo supportée
 */
export function isSupportedVideoUrl(url: string): boolean {
  return detectVideoPlatform(url) !== "unknown";
}

/**
 * Retourne le label humain de la plateforme vidéo
 */
export function getVideoPlatformLabel(platform: VideoPlatform): string {
  const labels: Record<VideoPlatform, string> = {
    youtube: "YouTube",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    twitter: "Twitter/X",
    unknown: "Vidéo",
  };
  return labels[platform];
}
