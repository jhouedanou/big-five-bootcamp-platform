/**
 * Messages d'erreur (FR) partagés pour les champs d'upload d'images.
 * Utilisés par : formulaire campagne (création + édition dans la liste),
 * éditeur de masse, temps forts.
 */

/** Le fichier est-il une vidéo ? (type MIME ou extension courante) */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true
  return /\.(mp4|mov|m4v|avi|mkv|webm|wmv|flv|3gp)$/i.test(file.name)
}

export const VIDEO_UPLOAD_ERROR_TITLE = "Fichier vidéo refusé — ce champ accepte uniquement des images"

export const VIDEO_UPLOAD_ERROR_DESCRIPTION =
  "Les vidéos (MP4, MOV…) ne s'uploadent pas ici. Mettez la vidéo en ligne sur la chaîne YouTube du compte analyticsbigfive@gmail.com, puis collez le lien YouTube dans le champ « Lien vidéo » de la campagne."

export const IMAGE_TYPE_ERROR_TITLE = "Type de fichier non supporté"
export const IMAGE_TYPE_ERROR_DESCRIPTION = "Formats acceptés : JPG, PNG, WebP, GIF, SVG."

export const IMAGE_TOO_LARGE_ERROR = "Fichier trop volumineux (10 Mo maximum)."
