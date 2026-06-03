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
 * Extrait le shortcode d'un post/reel Instagram
 * Formats: instagram.com/p/CODE, /reel/CODE, /tv/CODE
 */
function extractInstagramShortcode(url: string): string {
  const match = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([^/?#]+)/);
  return match ? match[1] : "";
}

/**
 * Extrait l'ID d'une vidéo TikTok
 * Format: tiktok.com/@user/video/VIDEO_ID
 */
function extractTikTokId(url: string): string {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return match ? match[1] : "";
}

/**
 * Génère l'URL d'embed LinkedIn à partir d'un post.
 * LinkedIn n'expose un iframe que pour les URN activity / ugcPost.
 * Les liens /posts/SLUG ne sont pas intégrables → null (fallback lien).
 */
function getLinkedInEmbedUrl(url: string): string | null {
  const activityMatch = url.match(/urn:li:activity:(\d+)/);
  if (activityMatch) {
    return `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityMatch[1]}`;
  }
  const ugcMatch = url.match(/urn:li:ugcPost:(\d+)/);
  if (ugcMatch) {
    return `https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:${ugcMatch[1]}`;
  }
  return null;
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
      // Embed officiel Facebook : plugins/video.php avec l'URL originale.
      // video/embed?video_id= n'est pas un endpoint public → iframe blanc.
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(originalUrl)}&show_text=false&width=560`;
    }
    case "twitter": {
      const tweetId = extractTwitterId(originalUrl);
      if (tweetId) {
        return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`;
      }
      return originalUrl;
    }
    case "instagram": {
      const shortcode = extractInstagramShortcode(originalUrl);
      if (shortcode) {
        return `https://www.instagram.com/p/${shortcode}/embed`;
      }
      return originalUrl;
    }
    case "tiktok": {
      const id = extractTikTokId(originalUrl);
      if (id) {
        return `https://www.tiktok.com/embed/v2/${id}`;
      }
      return originalUrl;
    }
    case "linkedin": {
      return getLinkedInEmbedUrl(originalUrl) || originalUrl;
    }
    default:
      return originalUrl;
  }
}

/**
 * Indique si une URL vidéo peut être intégrée dans un iframe (embed fiable).
 * Sert à décider d'afficher l'iframe ou le fallback (lien + icône) dans la modale.
 */
export function isEmbeddableVideoUrl(url: string): boolean {
  if (!url) return false;
  const originalUrl = getOriginalVideoUrl(url);
  const platform = detectVideoPlatform(originalUrl);
  switch (platform) {
    case "youtube":
      return !!extractYouTubeId(originalUrl);
    case "facebook":
      return true; // plugins/video.php gère le fallback href
    case "twitter":
      return !!extractTwitterId(originalUrl);
    case "instagram":
      return !!extractInstagramShortcode(originalUrl);
    case "tiktok":
      return !!extractTikTokId(originalUrl);
    case "linkedin":
      return !!getLinkedInEmbedUrl(originalUrl);
    default:
      return false;
  }
}

/**
 * Génère l'URL de la thumbnail pour une vidéo YouTube (synchrone)
 */
export function getYouTubeThumbnail(url: string): string | null {
  const originalUrl = getOriginalVideoUrl(url);
  const id = extractYouTubeId(originalUrl);
  if (!id) return null;
  // hqdefault existe toujours (maxresdefault renvoie souvent 404 → image cassée)
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Récupère une thumbnail vidéo si possible (actuellement seul YouTube expose
 * une thumbnail fiable sans appel API authentifié). Facebook/Instagram/TikTok
 * nécessitent leur oEmbed/Graph API → null ici, le composant affiche un
 * placeholder (icône vidéo). Aucun appel réseau n'est fait, donc pas de 429.
 */
export function getVideoThumbnail(url: string): string | null {
  const platform = detectVideoPlatform(getOriginalVideoUrl(url));
  if (platform === "youtube") return getYouTubeThumbnail(url);
  return null;
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
      thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
      break;
    case "facebook":
      videoId = extractFacebookVideoId(originalUrl);
      embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(originalUrl)}&show_text=false&width=560`;
      thumbnailUrl = null;
      break;
    case "twitter":
      videoId = extractTwitterId(originalUrl);
      embedUrl = videoId ? `https://platform.twitter.com/embed/Tweet.html?id=${videoId}` : originalUrl;
      thumbnailUrl = null;
      break;
    case "instagram":
      videoId = extractInstagramShortcode(originalUrl);
      embedUrl = videoId ? `https://www.instagram.com/p/${videoId}/embed` : originalUrl;
      thumbnailUrl = null;
      break;
    case "tiktok":
      videoId = extractTikTokId(originalUrl);
      embedUrl = videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : originalUrl;
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
 * Mappe un libellé de plateforme déclarée sur la campagne (ex. "Instagram",
 * "Twitter/X") vers la VideoPlatform correspondante. Utilisé pour prioriser la
 * plateforme réelle de la campagne plutôt qu'une détection depuis l'URL.
 * Retourne "unknown" si aucun mapping ne correspond.
 */
export function platformLabelToVideoPlatform(
  label: string | null | undefined,
): VideoPlatform {
  if (!label) return "unknown";
  const l = label.toLowerCase();
  if (l.includes("youtube")) return "youtube";
  if (l.includes("facebook")) return "facebook";
  if (l.includes("instagram")) return "instagram";
  if (l.includes("tiktok")) return "tiktok";
  if (l.includes("linkedin")) return "linkedin";
  if (l.includes("twitter") || l === "x" || l.includes("x.com")) return "twitter";
  return "unknown";
}

/**
 * Détermine l'orientation d'affichage d'une vidéo (portrait vs paysage) à
 * partir du format déclaré et de la plateforme. Sert à adapter le ratio de
 * l'iframe : 9/16 pour les contenus verticaux (Reels, Stories, TikTok,
 * Shorts), 16/9 sinon.
 */
export function getVideoOrientation(
  platformLabel: string | null | undefined,
  format?: string | null,
): "portrait" | "landscape" {
  const f = (format || "").toLowerCase();
  if (/(story|reel|short|vertical|portrait)/.test(f)) return "portrait";
  const p = platformLabelToVideoPlatform(platformLabel);
  if (p === "tiktok" || p === "instagram") return "portrait";
  return "landscape";
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
