import { sniffImageMime } from "@/lib/media-validation"
import { CAMPAIGN_MAX_WIDTH, normalizedSuffix } from "@/lib/image-presets"

/**
 * Normalisation des visuels côté serveur : largeur plafonnée à 580 px et
 * conversion WebP, pour que le bucket ne stocke jamais un export plein format
 * (1,2 Mo en médiane mesurée, contre ~40 Ko une fois normalisé).
 *
 * `sharp` est natif : disponible en local et sur Vercel (crons), absent du
 * runtime Cloudflare Workers. L'import est donc dynamique et TOUTE la
 * normalisation est un best-effort — en cas d'échec, les octets d'origine
 * partent tels quels et le cron quotidien (Vercel) rattrape les fichiers
 * surdimensionnés au passage suivant. Les GIF sont laissés intacts
 * (l'animation ne survivrait pas).
 */

const WEBP_QUALITY = 80

export {
  CAMPAIGN_MAX_WIDTH,
  IMAGE_PRESETS,
  MAX_PRESET_WIDTH,
  NORMALIZED_SUFFIXES,
  isNormalizedName,
  normalizedSuffix,
} from "@/lib/image-presets"

/**
 * Suffixe historique des vignettes de campagne. Conservé pour les appelants
 * existants (cron, script de redimensionnement) ; toute nouvelle sélection
 * passe par `NORMALIZED_SUFFIXES` / `isNormalizedName`, qui couvrent aussi les
 * largeurs autres que 580.
 */
export const NORMALIZED_SUFFIX = normalizedSuffix(CAMPAIGN_MAX_WIDTH)

export interface NormalizedImage {
  buf: Uint8Array
  contentType: string
  ext: string
  /** true si la normalisation a réellement eu lieu (sharp disponible et utile). */
  normalized: boolean
}

/**
 * `strict` : échouer bruyamment au lieu de rendre les octets bruts. Réservé aux
 * scripts de rattrapage, qui déposent le résultat sous un nom `-{largeur}.webp` :
 * en passthrough silencieux ils poseraient un suffixe MENTEUR sur un fichier
 * plein format, que plus rien ne rattraperait ensuite.
 */
export async function normalizeImageBuffer(
  input: Uint8Array,
  maxWidth = CAMPAIGN_MAX_WIDTH,
  opts: { strict?: boolean } = {},
): Promise<NormalizedImage> {
  const sniffed = sniffImageMime(input)
  const passthrough: NormalizedImage = {
    buf: input,
    contentType: sniffed || "application/octet-stream",
    ext: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[sniffed || ""] || "bin",
    normalized: false,
  }
  if (!sniffed || sniffed === "image/gif") return passthrough

  try {
    const sharp = (await import("sharp")).default
    const img = sharp(Buffer.from(input), { failOn: "error" })
    const meta = await img.metadata()

    // Déjà au format cible : ne pas ré-encoder (chaque passage dégrade).
    if (sniffed === "image/webp" && (meta.width ?? 0) <= maxWidth) return passthrough

    const out = await img
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

    // Une conversion qui alourdit est annulée (aplat déjà bien compressé).
    if (out.byteLength >= input.byteLength && (meta.width ?? 0) <= maxWidth) return passthrough

    return { buf: new Uint8Array(out), contentType: "image/webp", ext: "webp", normalized: true }
  } catch (err) {
    if (opts.strict) {
      throw new Error(
        `Normalisation impossible (sharp indisponible ou image illisible) : ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
    // sharp absent (Cloudflare Workers) ou décodage impossible : passthrough.
    return passthrough
  }
}
