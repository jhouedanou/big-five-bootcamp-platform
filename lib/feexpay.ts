/**
 * Client FeexPay — REST API
 *
 * Documentation officielle :
 *   https://docs.feexpay.me/?section=api-rest-integrations
 *
 * Ce module fournit :
 *   - La configuration (base URL, shop id, token, mode SANDBOX/LIVE)
 *   - Le helper pour initier un dépôt (collecte mobile money : requesttopay)
 *   - Le helper pour vérifier le statut (polling + re-vérification webhook)
 *   - Les types TypeScript des payloads
 *
 * ⚠️ L'API publique FeexPay n'expose PAS payout / refund / wallet-balances.
 * Ces fonctionnalités (présentes du temps de PawaPay) ont été retirées.
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Mode FeexPay — `SANDBOX` pour les tests, `LIVE` pour la prod.
 * Se configure via FEEXPAY_MODE (défaut: SANDBOX).
 * En mode LIVE, le token doit commencer par `fp_`.
 */
export type FeexPayMode = 'SANDBOX' | 'LIVE'

export const FEEXPAY_MODE: FeexPayMode =
  (process.env.FEEXPAY_MODE as FeexPayMode) || 'SANDBOX'

/**
 * FeexPay expose une seule base d'API ; le mode (sandbox/live) est porté par
 * le compte marchand et le token, pas par l'URL.
 */
export const FEEXPAY_BASE_URL = 'https://api.feexpay.me/api'

export const FEEXPAY_SHOP_ID = process.env.FEEXPAY_SHOP_ID || ''
export const FEEXPAY_API_TOKEN = process.env.FEEXPAY_API_TOKEN || ''

/**
 * URL publique de notre application (utilisée pour construire les success/failed
 * URLs et le webhook à déclarer dans le dashboard FeexPay).
 *
 * Doit être en HTTPS en production.
 */
function resolvePublicBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://laveiye.com'
      : 'http://localhost:3000')

  if (process.env.NODE_ENV === 'production') {
    if (/localhost|127\.0\.0\.1/i.test(raw) || !/^https:\/\//i.test(raw)) {
      console.warn(
        `NEXT_PUBLIC_APP_URL invalide en production : "${raw}". ` +
          `Définir une URL HTTPS publique (sans localhost).`
      )
    }
  }
  return raw
}

export const PUBLIC_BASE_URL = resolvePublicBaseUrl()

/**
 * URL publique du webhook à déclarer dans le Dashboard FeexPay.
 * Un seul webhook : les transactions de collecte (requesttopay).
 */
export const FEEXPAY_CALLBACK_URL = `${PUBLIC_BASE_URL}/api/payment/feexpay/callback/deposit`

/**
 * FeexPay ne publie pas de liste d'IP source pour ses webhooks. La sécurité
 * ne repose donc PAS sur l'IP : tout webhook déclenche une re-vérification
 * du statut via l'API authentifiée (cf. checkDepositStatus) avant tout effet
 * de bord. Cette fonction est conservée pour symétrie avec l'ancien code et
 * renvoie toujours true.
 */
export function isAllowedFeexPayIP(_request: Request): boolean {
  return true
}

// ============================================================================
// Types
// ============================================================================

/** Statuts renvoyés par l'API FeexPay (getrequesttopay). */
export type FeexPayStatus = 'SUCCESSFUL' | 'PENDING' | 'FAILED'

/** Réponse de l'initiation d'un dépôt (requesttopay/integration). */
export interface FeexPayInitResponse {
  /** Référence FeexPay — clé utilisée pour le polling de statut. */
  reference: string
  transaction_id?: string
  status?: FeexPayStatus
  message?: string
}

/** Réponse de la vérification de statut (getrequesttopay/integration/{reference}). */
export interface FeexPayStatusResponse {
  status: FeexPayStatus
  reference?: string
  amount?: number | string
  /** Métadonnées que nous avons fournies à l'initiation (echo). */
  callback_info?: Record<string, unknown>
  // Champs additionnels tolérés (FeexPay peut en ajouter).
  [key: string]: unknown
}

/**
 * Payload du webhook FeexPay (forme non documentée publiquement → tolérant).
 * On ne fait JAMAIS confiance à ces champs : ils servent uniquement à
 * retrouver la référence et déclencher une re-vérification GET.
 */
export interface FeexPayDepositCallback {
  reference?: string
  status?: FeexPayStatus
  amount?: number | string
  callback_info?: Record<string, unknown>
  [key: string]: unknown
}

// ============================================================================
// Client HTTP
// ============================================================================

async function feexpayFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!FEEXPAY_API_TOKEN) {
    throw new Error(
      'FEEXPAY_API_TOKEN manquant. Ajoutez-le dans vos variables d\'environnement.'
    )
  }

  const res = await fetch(`${FEEXPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FEEXPAY_API_TOKEN}`,
      ...(init.headers || {}),
    },
    // Ne jamais cacher les appels paiements
    cache: 'no-store',
  })

  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    throw new Error(
      `FeexPay ${path} → HTTP ${res.status}: ${JSON.stringify(json)}`
    )
  }
  return json as T
}

// ============================================================================
// Initiate — Deposit (collecte mobile money)
// ============================================================================

export interface InitiateDepositInput {
  /** Notre référence interne (UUID) — envoyée à FeexPay comme `customId`. */
  refCommand: string
  amount: number | string
  currency?: string // défaut "XOF"
  /** MSISDN, chiffres uniquement, indicatif inclus. */
  phoneNumber: string
  /** Chaîne opérateur FeexPay (ex. "ORANGE CI", "MTN", "WAVE CI"). */
  reseau: string
  /** Description affichée ; pour MTN les caractères non alphanum sont retirés. */
  description?: string
  firstName?: string
  email?: string
  /** Métadonnées renvoyées dans le webhook (notre metadata payment). */
  callbackInfo?: Record<string, unknown>
}

export async function initiateDeposit(
  input: InitiateDepositInput
): Promise<FeexPayInitResponse> {
  if (!FEEXPAY_SHOP_ID) {
    throw new Error(
      'FEEXPAY_SHOP_ID manquant. Ajoutez-le dans vos variables d\'environnement.'
    )
  }
  if (FEEXPAY_MODE === 'LIVE' && !FEEXPAY_API_TOKEN.startsWith('fp_')) {
    throw new Error(
      'Token FeexPay invalide pour le mode LIVE (doit commencer par "fp_").'
    )
  }

  // MTN refuse les caractères non alphanumériques dans la description.
  let description = input.description || ''
  if (input.reseau.toUpperCase().startsWith('MTN')) {
    description = description.replace(/[^a-zA-Z0-9 ]/g, '')
  }

  // FeexPay attend des chiffres uniquement (sans +).
  const phoneNumber = String(input.phoneNumber).replace(/\D/g, '')

  const body = {
    phoneNumber,
    amount: Number(input.amount),
    reseau: input.reseau,
    description,
    customId: input.refCommand,
    shop: FEEXPAY_SHOP_ID,
    token: FEEXPAY_API_TOKEN,
    callback_info: input.callbackInfo || {},
    currency: input.currency || 'XOF',
    first_name: input.firstName || '',
    email: input.email || '',
  }

  return feexpayFetch<FeexPayInitResponse>(
    '/transactions/requesttopay/integration',
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  )
}

// ============================================================================
// Check status — polling + re-vérification webhook
// ============================================================================

/**
 * Vérifie le statut réel d'une transaction auprès de FeexPay.
 * @param reference  Référence FeexPay retournée à l'initiation.
 */
export function checkDepositStatus(
  reference: string
): Promise<FeexPayStatusResponse> {
  return feexpayFetch<FeexPayStatusResponse>(
    `/transactions/getrequesttopay/integration/${encodeURIComponent(reference)}`,
    { method: 'GET' }
  )
}

// ============================================================================
// Helpers de compatibilité (génération de références, URLs de retour)
// ============================================================================

/**
 * Génère une référence commande unique (UUIDv4). Utilisée comme `customId`
 * FeexPay et stockée dans `payments.ref_command`.
 */
export function generateRefCommand(_prefix: string = 'BF'): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { randomUUID } = require('crypto') as typeof import('crypto')
  return randomUUID()
}

export function getReturnUrl(refCommand: string): string {
  return `${PUBLIC_BASE_URL}/payment/success?ref_command=${encodeURIComponent(refCommand)}`
}

export function getFailedUrl(refCommand: string): string {
  return `${PUBLIC_BASE_URL}/payment/failed?ref_command=${encodeURIComponent(refCommand)}`
}
