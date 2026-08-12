import 'server-only'
import { getIntegrationValue } from '@/lib/integration-settings'

/**
 * Génération d'images — abstraction fournisseur.
 *
 * Un seul fournisseur aujourd'hui (Gemini), mais l'interface reste neutre :
 * l'offre gratuite retenue autorise Google à exploiter les contenus soumis pour
 * améliorer ses produits, ce qui n'est pas tenable pour des créations clientes.
 * Le jour où l'équipe bascule sur une offre payante ou change de fournisseur,
 * seul ce fichier bouge.
 */

const GEMINI_MODEL = 'gemini-2.5-flash-image'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

/** La génération d'image est lente ; au-delà, l'appelant rendra la main. */
const TIMEOUT_MS = 90_000

export interface GeneratedImage {
  /** Données brutes de l'image produite. */
  buffer: Buffer
  mimeType: string
  provider: string
}

export interface ImageGenInput {
  prompt: string
  /** Création de référence, transmise au modèle pour qu'il en reprenne la logique. */
  reference?: { base64: string; mimeType: string } | null
  /** Format demandé par l'utilisateur (« 1:1 », « 4:5 », « 9:16 »…). */
  format?: string | null
}

export class ImageGenError extends Error {
  constructor(
    message: string,
    /** Message destiné à l'utilisateur, sans détail technique. */
    readonly userMessage: string,
    /** Statut HTTP à renvoyer au client — un quota n'est pas un 500. */
    readonly status: number = 502
  ) {
    super(message)
    this.name = 'ImageGenError'
  }
}

/**
 * Produit une image à partir du prompt (et éventuellement d'une référence).
 * Lève une ImageGenError porteuse d'un message affichable.
 *
 * Ordre des fournisseurs :
 *  1. Gemini, si une clé est configurée ET que l'appel aboutit — meilleure
 *     qualité, et seul à recevoir l'image de référence.
 *  2. Pollinations (FLUX), sans clé ni compte — repli automatique quand Gemini
 *     échoue (typiquement : 429 immédiat de l'offre gratuite, la facturation
 *     Google étant un préalable pour ce modèle et pas toujours activable).
 *     Testé en réel : ~1,5 s par image, prompt long accepté. Texte seul — la
 *     logique de la référence voyage via l'analyse de l'agent 1, ce qui reste
 *     conforme au brief (« ne jamais copier le visuel »).
 */
export async function generateImage(input: ImageGenInput): Promise<GeneratedImage> {
  const apiKey = await getIntegrationValue('gemini_api_key')

  if (apiKey) {
    try {
      return await generateWithGemini(input, apiKey)
    } catch (error) {
      if (!(error instanceof ImageGenError)) throw error
      console.warn(`Gemini indisponible (${error.message}) — repli sur Pollinations.`)
    }
  }

  return generateWithPollinations(input)
}

/** Dimensions par format demandé ; 4:5 par défaut (feed Instagram/Facebook). */
function dimensionsFor(format?: string | null): { width: number; height: number } {
  const f = (format || '').replace(/\s/g, '')
  if (f.includes('9:16') || /stor(y|ies)/i.test(f)) return { width: 1080, height: 1920 }
  if (f.includes('16:9')) return { width: 1280, height: 720 }
  if (f.includes('1:1') || /carr/i.test(f)) return { width: 1080, height: 1080 }
  return { width: 1080, height: 1350 }
}

async function generateWithPollinations(input: ImageGenInput): Promise<GeneratedImage> {
  const { width, height } = dimensionsFor(input.format)
  // nologo : pas de filigrane ; private : l'image ne rejoint pas la galerie
  // publique du service — ce sont des créations clientes.
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(input.prompt)}` +
    `?width=${width}&height=${height}&model=flux&nologo=true&private=true`

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (error: any) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    throw new ImageGenError(
      `Appel Pollinations échoué: ${error?.message || error}`,
      timedOut
        ? "La génération a pris trop de temps. Réessayez dans un instant."
        : "Le service de génération est momentanément injoignable.",
      timedOut ? 504 : 502
    )
  }

  const mimeType = response.headers.get('content-type') || ''
  if (!response.ok || !mimeType.startsWith('image/')) {
    console.error('Pollinations a répondu', response.status, mimeType)
    throw new ImageGenError(
      `Pollinations ${response.status} (${mimeType})`,
      "Le service de génération a renvoyé une erreur. Réessayez dans un instant.",
      502
    )
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType,
    provider: 'pollinations-flux',
  }
}

async function generateWithGemini(
  input: ImageGenInput,
  apiKey: string
): Promise<GeneratedImage> {

  const parts: any[] = []
  if (input.reference) {
    parts.push({
      inlineData: { mimeType: input.reference.mimeType, data: input.reference.base64 },
    })
  }
  parts.push({ text: input.prompt })

  let response: Response
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        // Sans TEXT en plus d'IMAGE, l'API refuse la requête pour ce modèle.
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error: any) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    throw new ImageGenError(
      `Appel Gemini échoué: ${error?.message || error}`,
      timedOut
        ? "La génération a pris trop de temps. Réessayez dans un instant."
        : "Le service de génération est momentanément injoignable."
    )
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    // La clé n'apparaît jamais dans les logs : elle est en query string, on ne
    // journalise que le statut et le corps de la réponse.
    console.error('Gemini a répondu', response.status, detail.slice(0, 400))

    if (response.status === 429) {
      // Vérifié en conditions réelles : l'offre gratuite refuse ce modèle dès
      // la première requête (generate_content_free_tier_requests ≈ 0). Un 429
      // immédiat signifie donc « facturation non activée », pas « revenez demain ».
      throw new ImageGenError(
        'Quota Gemini dépassé (429)',
        "Le quota du fournisseur d'images est atteint. Si cela se produit dès la première utilisation, la facturation du compte Google n'est pas activée — c'est un préalable pour ce modèle. Voir avec un administrateur (Intégrations).",
        429
      )
    }
    if (response.status === 400 || response.status === 403) {
      throw new ImageGenError(
        `Gemini ${response.status}`,
        "La génération a été refusée. Vérifiez la clé d'API dans Intégrations, ou reformulez votre brief.",
        502
      )
    }
    throw new ImageGenError(
      `Gemini ${response.status}`,
      "Le service de génération a renvoyé une erreur. Réessayez dans un instant."
    )
  }

  const data = await response.json().catch(() => null)
  const candidateParts: any[] = data?.candidates?.[0]?.content?.parts || []
  const imagePart = candidateParts.find((p) => p?.inlineData?.data)

  if (!imagePart) {
    // Cas courant : le modèle a refusé (politique de contenu) et n'a renvoyé
    // que du texte. On le remonte tel quel, c'est actionnable.
    const textPart = candidateParts.find((p) => typeof p?.text === 'string')?.text
    throw new ImageGenError(
      `Aucune image dans la réponse Gemini: ${textPart?.slice(0, 200) || 'réponse vide'}`,
      textPart
        ? `Aucune image n'a été produite. Le modèle a répondu : « ${textPart.slice(0, 200)} »`
        : "Aucune image n'a été produite. Reformulez votre brief et réessayez."
    )
  }

  return {
    buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType || 'image/png',
    provider: GEMINI_MODEL,
  }
}
