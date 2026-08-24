/**
 * Capture d'une image de couverture depuis un fichier vidéo local.
 *
 * Un fichier téléversé n'expose aucune vignette par URL, contrairement à
 * YouTube ou Drive : sans capture, la campagne partait sans visuel sur le
 * tableau de bord et l'admin devait faire une capture d'écran à la main
 * (recette du 19/08).
 *
 * La capture se fait sur le fichier LOCAL, avant l'envoi : un `blob:` est de
 * même origine, le canvas n'est donc pas « tainted » et `toBlob` fonctionne.
 * Depuis l'URL publique du stockage, la lecture du canvas dépendrait des
 * en-têtes CORS du bucket.
 */

/** Instant de capture : assez tard pour éviter un premier plan noir. */
const CAPTURE_AT_SECONDS = 1

const CAPTURE_TIMEOUT_MS = 10_000

/**
 * Renvoie une image JPEG de la vidéo, ou `null` si le navigateur ne sait pas
 * la décoder. Ne lève jamais : la vignette est un confort, pas un prérequis.
 */
export async function captureVideoPoster(file: File): Promise<File | null> {
  if (typeof document === "undefined") return null

  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement("video")
  video.preload = "metadata"
  video.muted = true
  video.playsInline = true
  video.src = objectUrl

  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), CAPTURE_TIMEOUT_MS)

      const fail = () => {
        clearTimeout(timer)
        resolve(null)
      }

      const draw = () => {
        clearTimeout(timer)
        try {
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          if (!canvas.width || !canvas.height) return resolve(null)

          const ctx = canvas.getContext("2d")
          if (!ctx) return resolve(null)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
        } catch {
          resolve(null)
        }
      }

      video.onerror = fail
      video.onloadedmetadata = () => {
        // Une vidéo plus courte que l'instant visé : on prend son milieu.
        const target = video.duration && video.duration < CAPTURE_AT_SECONDS
          ? video.duration / 2
          : CAPTURE_AT_SECONDS
        video.onseeked = draw
        try {
          video.currentTime = target
        } catch {
          fail()
        }
      }
    })

    if (!blob) return null

    const base = file.name.replace(/\.[^.]+$/, "") || "video"
    return new File([blob], `${base}-poster.jpg`, { type: "image/jpeg" })
  } finally {
    video.src = ""
    URL.revokeObjectURL(objectUrl)
  }
}
