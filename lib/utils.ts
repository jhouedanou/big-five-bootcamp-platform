import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
