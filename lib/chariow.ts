/**
 * Client Chariow — REST API (checkout hébergé)
 *
 * Documentation :
 *   https://chariow.dev/api-reference/checkout/init-checkout
 *   https://chariow.dev/en/guides/pulses (webhooks)
 *
 * Contrairement à FeexPay (collecte mobile money in-app), Chariow utilise un
 * checkout HÉBERGÉ :
 *   1. POST /checkout avec un `product_id` → on reçoit un `checkout_url`
 *   2. On redirige l'utilisateur vers ce `checkout_url` (il paie chez Chariow)
 *   3. Chariow déclenche un Pulse `successful.sale` vers notre webhook
 *      → on active l'abonnement après re-vérification via GET /sales/{id}
 *
 * ⚠️ La clé API doit rester côté serveur uniquement.
 */

import { generateRefCommand } from '@/lib/pawapay'

// ============================================================================
// Configuration
// ============================================================================

export const CHARIOW_BASE_URL = 'https://api.chariow.com/v1'

export const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY || ''

/**
 * URL publique de l'application (utilisée pour `redirect_url` après paiement).
 * Doit être en HTTPS en production. Copie locale de la logique FeexPay pour ne
 * pas coupler les deux modules.
 */
export function getPublicBaseUrl(): string {
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

export const PUBLIC_BASE_URL = getPublicBaseUrl()

/**
 * URL du webhook (Pulse) à déclarer dans Chariow (Automation → Pulses),
 * événement `successful.sale`.
 */
export const CHARIOW_PULSE_URL = `${PUBLIC_BASE_URL}/api/payment/chariow/pulse`

/**
 * Map code pays interne (3 lettres, cf. lib/pawapay-providers) → ISO 3166-1
 * alpha-2 attendu par le champ `phone.country_code` du checkout Chariow.
 */
export const COUNTRY_ISO: Record<string, string> = {
  CIV: 'CI',
  SEN: 'SN',
  BFA: 'BF',
  BEN: 'BJ',
  MLI: 'ML',
  TGO: 'TG',
  CMR: 'CM',
  NER: 'NE',
}

/**
 * Résout l'identifiant produit Chariow pour un couple (plan, billing) depuis
 * les variables d'environnement.
 *   plan    : "discovery" | "basic" | "pro"
 *   billing : "monthly" | "annual"
 *   → CHARIOW_PRODUCT_<PLAN>_<BILLING>  (ex. CHARIOW_PRODUCT_BASIC_MONTHLY)
 *
 * Le PRIX facturé est celui du produit Chariow ; il doit donc correspondre
 * exactement au prix du plan côté application.
 */
export function productIdForPlan(plan: string, billing: string): string {
  const planKey = String(plan || '').toUpperCase().trim()
  const billingKey =
    String(billing || '').toUpperCase().trim() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY'
  const envKey = `CHARIOW_PRODUCT_${planKey}_${billingKey}`
  const productId = process.env[envKey]
  if (!productId) {
    throw new Error(
      `${envKey} manquant. Créez le produit correspondant dans Chariow et ` +
        `ajoutez son product_id dans vos variables d'environnement.`
    )
  }
  return productId
}

// ============================================================================
// Types
// ============================================================================

/** Statut d'une vente Chariow. */
export type ChariowSaleStatus =
  | 'awaiting_payment'
  | 'completed'
  | 'failed'
  | 'refunded'

export interface ChariowPhone {
  /** Numéro, chiffres uniquement (sans indicatif "+"). */
  number: string
  /** Code pays ISO 3166-1 alpha-2 (ex. "CI"). */
  country_code: string
}

export interface InitCheckoutInput {
  productId: string
  email: string
  firstName: string
  lastName: string
  phone: ChariowPhone
  /** URL de retour après paiement. */
  redirectUrl?: string
  /** Métadonnées renvoyées dans le Pulse (≤ 10 clés, ≤ 255 car. par valeur). */
  customMetadata?: Record<string, string>
  /** Devise ISO 4217 (défaut : devise de la boutique). */
  paymentCurrency?: string
}

export interface InitCheckoutResult {
  step?: 'payment' | 'completed' | 'already_purchased'
  status?: ChariowSaleStatus
  /** URL de paiement hébergée (null pour les produits gratuits). */
  checkoutUrl: string | null
  transactionId?: string
  /** Identifiant public de la vente (`sal_…`). */
  saleId?: string
}

/** Forme tolérante d'une vente renvoyée par GET /sales/{id}. */
export interface ChariowSale {
  id?: string
  status?: ChariowSaleStatus
  amount?: { value?: number; currency?: string }
  custom_metadata?: Record<string, unknown>
  [key: string]: unknown
}

// ============================================================================
// Client HTTP
// ============================================================================

async function chariowFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!CHARIOW_API_KEY) {
    throw new Error(
      'CHARIOW_API_KEY manquant. Ajoutez-le dans vos variables d\'environnement.'
    )
  }

  const res = await fetch(`${CHARIOW_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHARIOW_API_KEY}`,
      ...(init.headers || {}),
    },
    // Ne jamais cacher les appels paiements.
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
    throw new Error(`Chariow ${path} → HTTP ${res.status}: ${JSON.stringify(json)}`)
  }
  return json as T
}

// ============================================================================
// Initiate checkout
// ============================================================================

export async function initCheckout(
  input: InitCheckoutInput
): Promise<InitCheckoutResult> {
  const body: Record<string, unknown> = {
    product_id: input.productId,
    email: input.email,
    first_name: input.firstName.slice(0, 50),
    last_name: (input.lastName || input.firstName || 'Client').slice(0, 50),
    phone: {
      number: String(input.phone.number).replace(/\D/g, ''),
      country_code: input.phone.country_code,
    },
  }
  if (input.redirectUrl) body.redirect_url = input.redirectUrl
  if (input.customMetadata) body.custom_metadata = input.customMetadata
  if (input.paymentCurrency) body.payment_currency = input.paymentCurrency

  const res = await chariowFetch<{ data?: any }>('/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const data = res?.data ?? {}
  return {
    step: data.step,
    status: data?.purchase?.status,
    checkoutUrl: data?.payment?.checkout_url ?? null,
    transactionId: data?.payment?.transaction_id,
    saleId: data?.purchase?.id,
  }
}

// ============================================================================
// Re-vérification (sécurité webhook)
// ============================================================================

/**
 * Récupère une vente pour re-vérifier son statut réel avant tout effet de bord.
 * Pendant de `checkDepositStatus` côté FeexPay.
 */
export async function getSale(saleId: string): Promise<ChariowSale> {
  const res = await chariowFetch<{ data?: ChariowSale }>(
    `/sales/${encodeURIComponent(saleId)}`,
    { method: 'GET' }
  )
  return (res?.data ?? res) as ChariowSale
}

// Référence interne (UUID) — réutilise l'implémentation FeexPay pour rester
// cohérent avec `payments.ref_command`.
export { generateRefCommand }
