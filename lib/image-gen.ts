import 'server-only'
import { getIntegrationValue, getIntegrationValues } from '@/lib/integration-settings'

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
  /** Prompt d'instructions — pour Gemini, qui suit des consignes. */
  prompt: string
  /**
   * Prompt purement descriptif pour les modèles de diffusion (FLUX). Sans lui,
   * `prompt` est utilisé partout — mais les diffusions rendent nettement mieux
   * une description de scène qu'une liste de règles.
   */
  diffusionPrompt?: string | null
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
 * Le moteur se choisit dans /admin/integrations (champ « modèle »). En
 * « Automatique » : FLUX.2 Klein via Cloudflare quand le compte est configuré
 * et que le format est carré (les FLUX Cloudflare n'exposent pas de
 * dimensions), service intégré sinon ; chaque échec passe au moteur suivant.
 * Un modèle choisi explicitement passe en tête, la chaîne automatique restant
 * derrière lui en secours. Gemini reste branché dans l'abstraction pour le
 * jour où une clé facturée existe.
 * Les modèles hors Gemini ne reçoivent que du texte : la logique de la
 * référence voyage via l'analyse de l'agent 1, conforme au brief.
 */

/**
 * Modèles Workers AI disponibles pour le studio — gratuits uniquement, par
 * décision d'équipe : seuls les modèles hébergés par Cloudflare sont couverts
 * par le quota quotidien gratuit. Les modèles partenaires, facturés dès la
 * première image, ont été retirés ; en rebrancher un = l'ajouter ici et dans
 * les options de lib/integration-settings (et gérer ses dimensions s'il en a).
 */
const CF_MODELS: Record<string, { path: string; label: string }> = {
  'flux-2-klein-4b': {
    path: '@cf/black-forest-labs/flux-2-klein-4b',
    label: 'FLUX.2 Klein 4B',
  },
  'flux-1-schnell': {
    path: '@cf/black-forest-labs/flux-1-schnell',
    label: 'FLUX.1 Schnell',
  },
}

export async function generateImage(input: ImageGenInput): Promise<GeneratedImage> {
  const config = await getIntegrationValues([
    'gemini_api_key',
    'cloudflare_account_id',
    'cloudflare_api_token',
    'image_model',
  ])

  const cloudflareReady = !!(config.cloudflare_account_id && config.cloudflare_api_token)

  type Attempt = { key: string; run: () => Promise<GeneratedImage> }
  const cf = (model: string): Attempt => ({
    key: 'cf:' + model,
    run: () =>
      generateWithCloudflare(input, config.cloudflare_account_id, config.cloudflare_api_token, model),
  })
  const pollinations: Attempt = { key: 'pollinations', run: () => generateWithPollinations(input) }
  const gemini: Attempt = { key: 'gemini', run: () => generateWithGemini(input, config.gemini_api_key) }

  // Chaîne automatique. Les FLUX Cloudflare sortent en carré uniquement : pour
  // un format vertical/horizontal explicitement demandé, le service intégré
  // (qui respecte les dimensions) passe devant — fidélité au format d'abord.
  const { width, height } = dimensionsFor(input.format)
  const wantsSquare = width === height
  const auto: Attempt[] = []
  if (cloudflareReady && wantsSquare) {
    auto.push(cf('flux-2-klein-4b'), cf('flux-1-schnell'), pollinations)
  } else if (cloudflareReady) {
    auto.push(pollinations, cf('flux-2-klein-4b'), cf('flux-1-schnell'))
  } else {
    auto.push(pollinations)
  }

  // Choix explicite : le modèle demandé passe en tête, l'automatique en secours.
  const attempts: Attempt[] = []
  const choice = (config.image_model || '').trim()
  if (choice.startsWith('cf:')) {
    const model = choice.slice(3)
    if (CF_MODELS[model] && cloudflareReady) attempts.push(cf(model))
    else if (CF_MODELS[model]) {
      console.warn(`Modèle ${model} choisi mais Cloudflare non configuré — chaîne automatique.`)
    }
  } else if (choice === 'pollinations') {
    attempts.push(pollinations)
  } else if (choice === 'gemini' && config.gemini_api_key) {
    attempts.push(gemini)
  }
  attempts.push(...auto)

  let lastError: ImageGenError | null = null
  const tried = new Set<string>()
  for (const attempt of attempts) {
    // Un moteur déjà tenté ne l'est pas deux fois (choix explicite = tête de
    // la chaîne automatique, par exemple).
    if (tried.has(attempt.key)) continue
    tried.add(attempt.key)
    try {
      return await attempt.run()
    } catch (error) {
      if (!(error instanceof ImageGenError)) throw error
      lastError = error
      console.warn(`Fournisseur d'images indisponible (${error.message}) — suivant.`)
    }
  }

  throw (
    lastError ||
    new ImageGenError(
      'aucun fournisseur',
      "Aucun service de génération n'est disponible pour le moment. Réessayez dans un instant.",
      503
    )
  )
}

/**
 * Cloudflare Workers AI. Réponse JSON `{ result: { image } }` en base64.
 * Les FLUX Klein et Schnell n'exposent pas de dimensions — seul le prompt
 * part, la sortie est au format natif du modèle (carré).
 */
async function generateWithCloudflare(
  input: ImageGenInput,
  accountId: string,
  token: string,
  model: string
): Promise<GeneratedImage> {
  const spec = CF_MODELS[model]
  if (!spec) {
    throw new ImageGenError(`Modèle Cloudflare inconnu: ${model}`, "Modèle de génération inconnu.", 502)
  }
  const body: Record<string, unknown> = {
    prompt: (input.diffusionPrompt || input.prompt).slice(0, 2048),
  }

  let response: Response
  try {
    response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${spec.path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    )
  } catch (error: any) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    throw new ImageGenError(
      `Appel Cloudflare échoué: ${error?.message || error}`,
      "Le service de génération est momentanément injoignable.",
      timedOut ? 504 : 502
    )
  }

  const data = await response.json().catch(() => null)

  if (!response.ok || !data?.success) {
    const detail = JSON.stringify(data?.errors || data || {}).slice(0, 300)
    console.error('Cloudflare AI a répondu', response.status, detail)
    if (response.status === 429) {
      throw new ImageGenError(
        `Quota Cloudflare atteint (429, ${spec.label})`,
        `Le quota Cloudflare est atteint pour ${spec.label}. Réessayez plus tard ou choisissez un autre modèle dans Intégrations.`,
        429
      )
    }
    if (response.status === 401 || response.status === 403) {
      throw new ImageGenError(
        `Cloudflare ${response.status}`,
        "Cloudflare a refusé le jeton d'API. Vérifiez l'identifiant de compte et le jeton dans Intégrations.",
        502
      )
    }
    throw new ImageGenError(
      `Cloudflare ${response.status}: ${detail}`,
      "Le service de génération a renvoyé une erreur. Réessayez dans un instant.",
      502
    )
  }

  const base64 = data?.result?.image
  if (typeof base64 !== 'string' || !base64) {
    throw new ImageGenError(
      'Réponse Cloudflare sans image',
      "Aucune image n'a été produite. Réessayez dans un instant.",
      502
    )
  }

  const buffer = Buffer.from(base64, 'base64')
  // Le type n'est pas annoncé dans la réponse JSON : on lit la signature.
  const mimeType = buffer[0] === 0x89 && buffer[1] === 0x50 ? 'image/png' : 'image/jpeg'

  return { buffer, mimeType, provider: 'cloudflare-' + model }
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
    `https://image.pollinations.ai/prompt/${encodeURIComponent(input.diffusionPrompt || input.prompt)}` +
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
