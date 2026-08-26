import {
  detectVideoPlatform,
  isEmbeddableVideoUrl,
  getEmbedUrl,
  extractGoogleDriveFileId,
  type VideoPlatform,
} from "@/lib/video-utils";
import { isGoogleDriveHostedUrl, isEphemeralGoogleImageUrl } from "@/lib/utils";

/**
 * Validation média partagée entre le bulk editor (client) et l'API serveur.
 * Ce fichier ne contient QUE de la logique pure (pas d'accès réseau, pas de
 * node:*) pour être importable des deux côtés. Les sondes réseau (public ?
 * embeddable ?) vivent dans app/api/admin/validate-media/route.ts.
 */

export type MediaKind = "drive-file" | "video-platform" | "direct-image" | "unknown";

export interface MediaValidationResult {
  url: string;
  kind: MediaKind;
  platform: VideoPlatform | null;
  /** Le média est-il publiquement accessible (probe réseau côté serveur) ? */
  isPublic: boolean | null;
  /** La vidéo est-elle intégrable en iframe (pas restreinte par l'auteur) ? */
  embeddable: boolean | null;
  /** URL d'embed iframe si applicable. */
  embedUrl: string | null;
  /** Si une image Drive a été re-hébergée sur Supabase, l'URL stable. */
  rehostedUrl: string | null;
  /** Type MIME détecté lors de la sonde. */
  contentType: string | null;
  /** true si tout est OK (public + embeddable le cas échéant). */
  ok: boolean;
  /** Raison lisible en cas d'échec. */
  reason: string | null;
}

/**
 * Classe une URL média SANS accès réseau, à partir de sa forme seule.
 * - drive-file     : lien Google Drive (fichier) → à sonder + re-héberger/embed
 * - video-platform : YouTube/Facebook/Instagram/TikTok/LinkedIn/Twitter
 * - direct-image   : URL d'image directe (extension connue)
 * - unknown        : non reconnu
 */
export function classifyMediaUrl(url: string): { kind: MediaKind; platform: VideoPlatform | null } {
  const u = (url || "").trim();
  if (!u) return { kind: "unknown", platform: null };

  // Lien de partage Google Drive : peut être image OU vidéo — sonde réseau tranchera.
  if (/drive\.google\.com/i.test(u) && extractGoogleDriveFileId(u)) {
    return { kind: "drive-file", platform: "drive" };
  }

  const platform = detectVideoPlatform(u);
  if (platform !== "unknown") {
    return { kind: "video-platform", platform };
  }

  if (/\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(u)) {
    return { kind: "direct-image", platform: null };
  }

  // Image Drive sous forme directe (lh3.googleusercontent.com/d/ID, sans
  // extension) → traiter comme image à re-héberger (la sonde confirmera l'accès).
  if (isGoogleDriveHostedUrl(u)) {
    return { kind: "direct-image", platform: null };
  }

  return { kind: "unknown", platform: null };
}

/**
 * Types d'image reconnus à leurs octets d'en-tête. SVG absent volontairement :
 * il n'est plus accepté dans le bucket public (voir lib/storage-buckets.ts).
 */
const IMAGE_SIGNATURES: Array<{ mime: string; test: (b: Uint8Array) => boolean }> = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/gif",
    test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  },
  {
    // RIFF....WEBP
    mime: "image/webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    // ....ftypavif / ftypavis
    mime: "image/avif",
    test: (b) =>
      b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 &&
      b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 &&
      (b[11] === 0x66 || b[11] === 0x73),
  },
]

/**
 * Détermine le vrai type d'une image à partir de ses premiers octets, sans se
 * fier à l'en-tête `content-type` ni à l'extension.
 *
 * Indispensable ici : quand un fichier Google Drive a été supprimé, Google
 * répond `HTTP 200` avec la page de connexion `accounts.google.com`. Le code
 * de statut et l'absence d'erreur laissent croire à un succès, et sans ce
 * contrôle cette page HTML finissait téléversée dans le bucket sous un nom
 * `.jpg` — la campagne passait au vert avec un visuel définitivement cassé.
 *
 * Retourne null si les octets ne correspondent à aucun format d'image connu.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.byteLength < 12) return null
  for (const sig of IMAGE_SIGNATURES) {
    if (sig.test(bytes)) return sig.mime
  }
  return null
}

/** État d'un média tel que persisté sur `campaigns.media_status`. */
export type MediaState = "secured" | "external" | "broken" | "empty"

/**
 * Classe une URL SANS accès réseau : « le média est-il hébergé par LAVEIYE ? »
 * Ne distingue pas `external` de `broken` — seule une sonde réseau le peut.
 */
export function classifyMediaHosting(
  url: string | null | undefined,
  storageOrigin: string,
): "secured" | "external" | "empty" {
  const u = (url || "").trim()
  if (!u) return "empty"
  try {
    return new URL(u).origin === new URL(storageOrigin).origin ? "secured" : "external"
  } catch {
    return "external"
  }
}

export const MEDIA_REASONS = {
  drivePrivate:
    "Lien Google Drive non public : le partage doit être « Tous les utilisateurs disposant du lien ». Ouvrez Partager → Accès général → Tous les utilisateurs.",
  driveRequestAccess:
    "Google Drive renvoie une page « Demander l'accès » : le fichier est restreint.",
  embedDisabled:
    "L'auteur a désactivé l'intégration de cette vidéo : elle ne peut pas être lue en iframe sur le site.",
  unreachable: "Média inaccessible (URL morte, supprimée ou réseau).",
  ephemeral:
    "URL Google temporaire (expire et renvoie une 403). Collez le lien de partage Drive ou uploadez le fichier.",
  unknown: "Format d'URL non reconnu (ni vidéo supportée, ni image, ni Drive).",
  notAnImage:
    "L'URL répond, mais ne renvoie pas une image : le fichier source a été supprimé et Google sert sa page de connexion à la place. Le visuel doit être réuploadé.",
  tooLarge: "Image trop volumineuse : elle dépasse la limite du stockage.",
} as const;

/**
 * Pré-validation synchrone côté client (avant l'appel réseau) : attrape les
 * cas évidents pour un retour instantané. Retourne null si une sonde serveur
 * est nécessaire.
 */
export function preValidateMediaUrl(url: string): MediaValidationResult | null {
  const u = (url || "").trim();
  const base: MediaValidationResult = {
    url: u,
    kind: "unknown",
    platform: null,
    isPublic: null,
    embeddable: null,
    embedUrl: null,
    rehostedUrl: null,
    contentType: null,
    ok: false,
    reason: null,
  };

  if (!u) return { ...base, reason: MEDIA_REASONS.unknown };

  if (isEphemeralGoogleImageUrl(u)) {
    return { ...base, kind: "direct-image", reason: MEDIA_REASONS.ephemeral };
  }

  const { kind, platform } = classifyMediaUrl(u);

  if (kind === "unknown") {
    return { ...base, reason: MEDIA_REASONS.unknown };
  }

  // Plateforme vidéo NON-Drive : embeddabilité structurelle connue sans réseau.
  // (La restriction auteur YouTube/Vimeo reste à confirmer côté serveur.)
  if (kind === "video-platform" && !isGoogleDriveHostedUrl(u)) {
    const embeddable = isEmbeddableVideoUrl(u);
    if (!embeddable) {
      return { ...base, kind, platform, embeddable: false, reason: MEDIA_REASONS.embedDisabled };
    }
    // Structurellement OK — laisser le serveur confirmer la dispo réelle.
    return null;
  }

  // Drive et images directes → sonde serveur obligatoire.
  return null;
}

/** URL d'embed pour une plateforme vidéo (réutilise video-utils). */
export function buildEmbedUrl(url: string): string {
  return getEmbedUrl(url);
}
