/**
 * Largeurs cibles et convention de nommage des visuels normalisés.
 *
 * Module volontairement sans dépendance : importé aussi bien par
 * `lib/image-client.ts` (canvas, navigateur) que par `lib/image-server.ts`
 * (sharp, Node), le cron et les scripts. Faire importer l'un par l'autre
 * tirerait `sharp` dans le bundle navigateur.
 *
 * Chaque largeur correspond à une taille d'affichage réelle, pas à une valeur
 * ronde : une image stockée plus large que sa taille de rendu est du poids pur
 * — et, plus coûteux encore, de la mémoire de décodage. Un visuel de
 * 10068 × 10068 pèse 261 Ko sur le réseau mais ~405 Mo une fois décodé en RGBA.
 */

export const IMAGE_PRESETS = {
  /** Vignettes de campagne. Ne pas changer : 818 fichiers `-580.webp` en prod. */
  campaignThumb: 580,
  /** Galerie de campagne — affichée en `width={1200}` sur la fiche contenu. */
  gallery: 1200,
  /** Bannières du tableau de bord — format annoncé 1200×375. */
  banner: 1200,
  /** Temps forts : visuel de carte et de pop-up. */
  tempsFort: 1200,
  /** Visuel hero d'un temps fort, affiché pleine largeur. */
  tempsFortHero: 1600,
  /** Couverture d'étude et pages du carrousel (source de référence : 893 px). */
  studyCover: 1200,
  /** Logo et logo sombre (`site_settings`), rendus entre 132 et 208 px. */
  brand: 512,
  /** Avatar de profil. */
  avatar: 256,
  /**
   * Référence envoyée au modèle de vision du studio publicitaire. Elle repart
   * en base64 dans la requête : la normaliser divise aussi le coût par appel.
   */
  studioReference: 1536,
} as const

export type ImagePreset = keyof typeof IMAGE_PRESETS

/** Largeur par défaut, historique : les vignettes de campagne. */
export const CAMPAIGN_MAX_WIDTH: number = IMAGE_PRESETS.campaignThumb

/** Plafond de repli côté serveur : ne jamais réduire en deçà sans consigne. */
export const MAX_PRESET_WIDTH: number = Math.max(...Object.values(IMAGE_PRESETS))

/** Suffixe canonique d'un fichier normalisé à `width` px. */
export const normalizedSuffix = (width: number) => `-${width}.webp`

/**
 * Ensemble CLOS des suffixes reconnus comme « déjà normalisé ».
 *
 * Deux conventions coexistent en prod et sont toutes deux acceptées :
 * `-580.webp` (818 vignettes) et `-w1200.webp` (33 galeries migrées par script).
 * Aucune n'est réécrite : reconnaître suffit, et une réécriture ferait bouger
 * 851 URLs en base pour rien.
 *
 * Un ensemble clos plutôt qu'une expression régulière `-w?\d+\.webp` : le nom
 * des objets est `{horodatage}-{alea}.webp` où l'aléa est tiré en base 36 et
 * peut être entièrement numérique. Une regex marquerait alors « déjà
 * normalisé » un fichier qui ne l'est pas, et plus rien ne le rattraperait.
 */
export const NORMALIZED_SUFFIXES: readonly string[] = Array.from(
  new Set(
    Object.values(IMAGE_PRESETS).flatMap((w) => [`-${w}.webp`, `-w${w}.webp`]),
  ),
)

/** Vrai si l'URL ou le nom porte déjà une marque de normalisation connue. */
export function isNormalizedName(name: string): boolean {
  const clean = name.toLowerCase().split("?")[0]
  return NORMALIZED_SUFFIXES.some((s) => clean.endsWith(s))
}

/** Le suffixe reconnu que porte `name`, ou `null` s'il n'en porte aucun. */
export function normalizedSuffixOf(name: string): string | null {
  const clean = name.toLowerCase().split("?")[0]
  return NORMALIZED_SUFFIXES.find((s) => clean.endsWith(s)) ?? null
}
