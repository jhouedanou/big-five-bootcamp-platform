"use client"

/**
 * Normalisation des visuels côté navigateur, AVANT l'envoi à /api/upload.
 *
 * Le poids du bucket vient des exports pleine résolution (1,2 Mo en médiane
 * mesurée sur la bibliothèque, jusqu'à 2,8 Mo) alors que les vignettes de
 * campagne s'affichent bien en dessous de 580 px. Redimensionner et convertir
 * en WebP dans le navigateur divise le poids par 10 à 20 sans dépendance
 * serveur — le stockage ne reçoit plus que la version utile.
 *
 * Les GIF sont laissés tels quels : un passage par canvas perdrait l'animation.
 */

import { CAMPAIGN_MAX_WIDTH, normalizedSuffix } from "@/lib/image-presets"

export { CAMPAIGN_MAX_WIDTH, IMAGE_PRESETS } from "@/lib/image-presets"

const WEBP_QUALITY = 0.8

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Redimensionne `file` à `maxWidth` de large au plus et le convertit en WebP.
 * Retourne le fichier d'origine si la normalisation n'apporte rien (GIF,
 * décodage impossible, ou résultat plus lourd que l'original).
 */
export async function normalizeImageFile(file: File, maxWidth = CAMPAIGN_MAX_WIDTH): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file // format non décodable ici : le serveur tranchera
  }

  try {
    const scale = Math.min(1, maxWidth / bitmap.width)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    // Déjà petit et déjà WebP : rien à gagner.
    if (scale === 1 && file.type === "image/webp") return file

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    // WebP d'abord ; les navigateurs qui ne l'encodent pas renvoient un PNG —
    // dans ce cas on retombe sur du JPEG, toujours mieux qu'un PNG plein format.
    let blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY)
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.85)
    }
    if (!blob) return file

    // Une conversion qui alourdit (petit PNG d'aplat, par exemple) est annulée.
    if (scale === 1 && blob.size >= file.size) return file

    const base = file.name.replace(/\.[^.]+$/, "")
    // Seul le WebP porte le suffixe de normalisation : le repli JPEG doit rester
    // rattrapable par le cron, un suffixe menteur le rendrait invisible.
    const name =
      blob.type === "image/webp" ? `${base}${normalizedSuffix(maxWidth)}` : `${base}.jpg`
    return new File([blob], name, { type: blob.type })
  } finally {
    bitmap.close()
  }
}
