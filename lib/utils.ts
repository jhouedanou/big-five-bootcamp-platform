import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Corrige les textes corrompus par un mauvais encodage CSV (Windows-1252 → UTF-8).
 * Les caractères accentués ont été remplacés par U+FFFD (�) lors de l'import.
 * Cette fonction reconstruit les mots français cassés par pattern matching contextuel.
 *
 * Stratégie d'ordonnancement :
 * 1. Mots complets multi-\uFFFD (téléphone, bénéfice, etc.) — les plus spécifiques
 * 2. Mots complets mono-\uFFFD (année, créa, centré, etc.)
 * 3. Noms propres (Côte d'Ivoire, Cody's, etc.)
 * 4. Apostrophe contextuelle (l'\uFFFD, d'\uFFFD etc.) — UNIQUEMENT avant une voyelle
 * 5. \uFFFD isolé en début de mot → « (guillemet ouvrant) ou é/è/ê
 * 6. Fallback : tout \uFFFD restant → apostrophe droite
 */
const BROKEN_WORD_MAP: [RegExp, string][] = [
  // ============================================================
  // PHASE 1 : Mots complets avec PLUSIEURS \uFFFD (plus spécifiques d'abord)
  // ============================================================
  [/t\uFFFDl\uFFFDphone/gi, "téléphone"],
  [/t\uFFFDl\uFFFDchargement/gi, "téléchargement"],
  [/b\uFFFDn\uFFFDfice/gi, "bénéfice"],
  [/c\uFFFDt\uFFFD/g, "côté"],
  [/soci\uFFFDt\uFFFD/gi, "société"],
  [/s\uFFFDcurit\uFFFD/gi, "sécurité"],
  [/r\uFFFDf\uFFFDrence/gi, "référence"],
  [/g\uFFFDn\uFFFDr/gi, "génér"],
  [/\uFFFDv\uFFFDnement/gi, "événement"],
  [/connect\uFFFD\uFFFD/g, "connecté»"],  // connecté + guillemet fermant

  // ============================================================
  // PHASE 2 : Mots complets avec UN seul \uFFFD
  // ============================================================
  // é dans le mot
  [/ann\uFFFDe/gi, "année"],
  [/cr\uFFFDa/gi, "créa"],
  [/cr\uFFFDdit/gi, "crédit"],
  [/cr\uFFFDer/gi, "créer"],
  [/centr\uFFFD/g, "centré"],
  [/connect\uFFFD/g, "connecté"],
  [/associ\uFFFDes/gi, "associées"],
  [/pr\uFFFDsence/gi, "présence"],
  [/sugg\uFFFDre/gi, "suggère"],
  [/utilis\uFFFD/g, "utilisé"],
  [/utilit\uFFFD/g, "utilité"],
  [/march\uFFFD/g, "marché"],
  [/qualit\uFFFD/g, "qualité"],
  [/activit\uFFFD/g, "activité"],
  [/libert\uFFFD/g, "liberté"],
  [/communaut\uFFFD/g, "communauté"],
  [/r\uFFFDseau/gi, "réseau"],
  [/num\uFFFDrique/gi, "numérique"],
  [/strat\uFFFDg/gi, "stratég"],
  [/m\uFFFDdia/gi, "média"],
  [/exp\uFFFDrience/gi, "expérience"],
  [/diff\uFFFDrent/gi, "différent"],
  [/int\uFFFDgr/gi, "intégr"],
  [/r\uFFFDpond/gi, "répond"],
  // ô dans le mot
  [/plut\uFFFDt/gi, "plutôt"],
  // Mots commençant par é
  [/\uFFFDmotionnelle/gi, "émotionnelle"],
  [/\uFFFDmotion/gi, "émotion"],
  [/\uFFFDnergie/gi, "énergie"],
  [/\uFFFDconomie/gi, "économie"],
  [/\uFFFDquipe/gi, "équipe"],
  [/\uFFFDcran/gi, "écran"],
  [/\uFFFDl\uFFFDment/gi, "élément"],

  // ============================================================
  // PHASE 3 : Noms propres / pays
  // ============================================================
  [/C\uFFFDte d[''\u2019]Ivoire/gi, "Côte d'Ivoire"],
  [/C\uFFFDte d\uFFFDIvoire/gi, "Côte d'Ivoire"],
  [/Cody\uFFFDs/g, "Cody's"],

  // ============================================================
  // PHASE 4 : Apostrophe contextuelle (l' d' s' n' qu')
  // Seulement quand \uFFFD est entre une consonne élidable et une voyelle
  // ============================================================
  [/\bl\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "l'"],
  [/\bd\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "d'"],
  [/\bs\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "s'"],
  [/\bn\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "n'"],
  [/\bqu\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "qu'"],
  [/\bj\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "j'"],
  [/\bL\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "L'"],
  [/\bD\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "D'"],
  [/\bS\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "S'"],
  [/\bN\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "N'"],
  [/\bJ\uFFFD(?=[aeiouyàâäéèêëîïôùûühAEIOUY])/g, "J'"],
  // l' d' en milieu de mot (ex: "l'image" → espace+l+\uFFFD+voyelle)
  [/(?<=\s)l\uFFFD/g, "l'"],
  [/(?<=\s)d\uFFFD/g, "d'"],
  [/(?<=\s)L\uFFFD/g, "L'"],
  [/(?<=\s)D\uFFFD/g, "D'"],

  // ============================================================
  // PHASE 5 : \uFFFD isolé entre espaces ou après élision → à
  // Ex: "cherche \uFFFD créer" → "cherche à créer"
  // Ex: "qu\uFFFD pousser" → "qu'à pousser"
  // Ex: "produit \uFFFD l'" → "produit à l'"
  // ============================================================
  [/(?<=\s)\uFFFD(?=\s)/g, "à"],
  // qu + \uFFFD + consonne = "qu'à" (ex: "plutôt qu\uFFFD pousser")
  [/\bqu\uFFFD(?=\s)/g, "qu'à"],

  // ============================================================
  // PHASE 5b : Caractères arméniens parasites (double-encodage CP-1252)
  // Ո (U+0548) = à corrompu, Վ (U+054E) = é corrompu
  // Ex: "qu\u0548 pousser" → "qu'à pousser", "l\u054Energie" → "l'énergie"
  // ============================================================
  [/\bqu\u0548(?=\s)/g, "qu'à"],
  [/(?<=\s)\u0548(?=\s)/g, "à"],
  [/\bl\u054E(?=[aeiouyàâäéèêëîïôùûüh])/gi, "l'é"],
  [/\bd\u054E(?=[aeiouyàâäéèêëîïôùûüh])/gi, "d'é"],
  [/\u054E(?=[a-zàâäéèêëîïôùûüç])/g, "é"],
  [/\u0548/g, "à"],
  [/\u054E/g, "é"],

  // ============================================================
  // PHASE 6 : Guillemets par position
  // \uFFFD suivi d'un mot (pas précédé d'une lettre) → «
  // \uFFFD après un mot et avant ponctuation/espace/fin → »
  // ============================================================
  [/(?<![a-zA-ZàâäéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ'])\uFFFD(?=[a-zA-ZàâäéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ])/g, "«\u00A0"],
  [/(?<=[a-zA-ZàâäéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ])\uFFFD(?=[\s.,;:!?\n)]|$)/g, "\u00A0»"],

  // ============================================================
  // PHASE 7 : Fallback — tout \uFFFD restant → apostrophe droite
  // ============================================================
  [/\uFFFD/g, "'"],
]

export function fixBrokenEncoding(text: string | null | undefined): string {
  if (!text) return text ?? ''
  // Ne rien faire si pas de U+FFFD ni de caractères arméniens parasites
  if (!text.includes('\uFFFD') && !text.includes('\u0548') && !text.includes('\u054E')) return text

  let result = text
  for (const [pattern, replacement] of BROKEN_WORD_MAP) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * Convertit une URL Google Drive en URL d'image directement affichable.
 * Supporte tous les formats courants de liens Drive :
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID&export=view
 * - https://drive.google.com/thumbnail?id=FILE_ID
 * - https://lh3.googleusercontent.com/d/FILE_ID
 * 
 * Si l'URL n'est pas un lien Google Drive, elle est retournée telle quelle.
 * Si c'est un lien Apps Script (script.google.com), il est aussi retourné tel quel
 * car il sert déjà de proxy permanent.
 */
export function getGoogleDriveImageUrl(url: string): string {
  if (!url) return url

  // Si c'est déjà un lien Apps Script (proxy permanent), le garder tel quel
  if (url.includes('script.google.com') || url.includes('script.googleusercontent.com')) {
    return url
  }

  // Déjà un lien googleusercontent direct
  if (url.includes('lh3.googleusercontent.com')) {
    return url
  }

  // Format: https://drive.google.com/file/d/FILE_ID/...
  const fileIdMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileIdMatch) {
    return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`
  }

  // Format: https://drive.google.com/open?id=FILE_ID
  const openIdMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
  if (openIdMatch) {
    return `https://lh3.googleusercontent.com/d/${openIdMatch[1]}`
  }

  // Format: https://drive.google.com/uc?id=FILE_ID ou /uc?export=view&id=FILE_ID
  const ucIdMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/)
  if (ucIdMatch) {
    return `https://lh3.googleusercontent.com/d/${ucIdMatch[1]}`
  }

  // Format: https://drive.google.com/thumbnail?id=FILE_ID
  const thumbMatch = url.match(/drive\.google\.com\/thumbnail\?.*id=([a-zA-Z0-9_-]+)/)
  if (thumbMatch) {
    return `https://lh3.googleusercontent.com/d/${thumbMatch[1]}`
  }

  // Pas un lien Google Drive — retourner tel quel
  return url
}

/**
 * Génère un slug SEO-friendly à partir d'un texte.
 * - Convertit en minuscules
 * - Remplace les caractères accentués (é→e, à→a, etc.)
 * - Supprime les caractères spéciaux
 * - Remplace les espaces par des tirets
 * - Supprime les tirets en début/fin et les doublons
 * 
 * @example generateSlug("Campagne MTN Côte d'Ivoire 2024") → "campagne-mtn-cote-divoire-2024"
 */
export function generateSlug(text: string): string {
  if (!text) return ''

  const accentMap: Record<string, string> = {
    'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'ã': 'a',
    'è': 'e', 'ê': 'e', 'ë': 'e', 'é': 'e',
    'ì': 'i', 'î': 'i', 'ï': 'i', 'í': 'i',
    'ò': 'o', 'ô': 'o', 'ö': 'o', 'ó': 'o', 'õ': 'o',
    'ù': 'u', 'û': 'u', 'ü': 'u', 'ú': 'u',
    'ñ': 'n', 'ç': 'c', 'ß': 'ss',
  }

  return text
    .toLowerCase()
    .split('')
    .map(char => accentMap[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')  // Supprimer les caractères spéciaux
    .replace(/\s+/g, '-')          // Espaces → tirets
    .replace(/-+/g, '-')           // Tirets multiples → un seul
    .replace(/^-|-$/g, '')         // Supprimer tirets en début/fin
    .slice(0, 250)                 // Limiter la longueur
}
