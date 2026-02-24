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
