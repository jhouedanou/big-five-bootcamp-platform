/**
 * Chariow Payment Integration
 *
 * Configuration et helpers pour l'intégration Chariow (widget de paiement).
 */

import { COUNTRY_DIAL_CODES } from '@/lib/countries';

export const CHARIOW_CONFIG = {
  API_KEY: process.env.CHARIOW_API_KEY || '',
  PRODUCT_ID: process.env.CHARIOW_PRODUCT_ID || '',
  WEBHOOK_SECRET: process.env.CHARIOW_WEBHOOK_SECRET || '',
  API_URL: process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1',
  // URL du checkout hosté Chariow. À ajuster selon docs Chariow réelles.
  // Pattern courant : https://checkout.chariow.com/{productId}?metadata=...
  CHECKOUT_URL: process.env.CHARIOW_CHECKOUT_URL || 'https://checkout.chariow.com',
};

export const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY || '';
export const CHARIOW_BASE_URL = CHARIOW_CONFIG.API_URL;

/**
 * URL publique de l'application (utilisée pour `redirect_url` après paiement).
 * Doit être en HTTPS en production.
 */
export function getPublicBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://laveiye.com'
      : 'http://localhost:3000');

  if (process.env.NODE_ENV === 'production') {
    if (/localhost|127\.0\.0\.1/i.test(raw) || !/^https:\/\//i.test(raw)) {
      console.warn(
        `NEXT_PUBLIC_APP_URL invalide en production : "${raw}". ` +
          `Définir une URL HTTPS publique (sans localhost).`
      );
    }
  }
  return raw;
}

export const PUBLIC_BASE_URL = getPublicBaseUrl();

/** URL du webhook (Pulse) à déclarer dans Chariow. */
export const CHARIOW_PULSE_URL = `${PUBLIC_BASE_URL}/api/webhook/chariow`;

/**
 * Map code pays interne (3 lettres) → ISO 3166-1 alpha-2 attendu par le champ
 * `phone.country_code` du checkout Chariow.
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
};

/**
 * Résout le code ISO alpha-2 d'un pays de checkout. Accepte :
 *  - le code interne 3 lettres des pays mobile money (CIV, SEN, …)
 *  - n'importe quel code ISO alpha-2 connu (Moneroo accepte la quasi-totalité
 *    des pays — carte bancaire & co pour les pays sans mobile money).
 * Retourne null si le code est inconnu.
 */
export function resolveCountryIso(code: string | null | undefined): string | null {
  const key = String(code || '').toUpperCase().trim();
  if (COUNTRY_ISO[key]) return COUNTRY_ISO[key];
  if (/^[A-Z]{2}$/.test(key) && COUNTRY_DIAL_CODES[key]) return key;
  return null;
}

/**
 * Retire l'indicatif international du numéro si l'utilisateur l'a saisi
 * (ex. "22507070707xx" → "07070707xx" pour CI). Chariow/Moneroo attendent le
 * numéro national seul, l'indicatif étant porté par `country_code`.
 */
export function stripDialPrefix(digits: string, countryIso: string): string {
  let num = String(digits).replace(/\D/g, '');
  // Préfixe de sortie international "00" éventuel (ex. "00225…").
  if (num.startsWith('00')) num = num.slice(2);
  const dial = COUNTRY_DIAL_CODES[countryIso];
  if (dial && num.startsWith(dial) && num.length - dial.length >= 6) {
    num = num.slice(dial.length);
  }
  return num;
}

/**
 * Résout le product_id Chariow pour un couple (plan, billing).
 * Lit `CHARIOW_PRODUCT_<PLAN>_<BILLING>` (ex: CHARIOW_PRODUCT_PRO_ANNUAL).
 * Retombe sur `CHARIOW_PRODUCT_ID` si la variable spécifique est absente.
 */
export function getProductId(
  plan: string | null | undefined,
  billing: 'monthly' | 'annual' | string | null | undefined,
): string {
  const planKey = String(plan || '').toUpperCase().trim();
  const billingKey = String(billing || '').toLowerCase().trim() === 'annual' ? 'ANNUAL' : 'MONTHLY';
  if (planKey === 'DISCOVERY' || planKey === 'BASIC' || planKey === 'PRO') {
    const value = process.env[`CHARIOW_PRODUCT_${planKey}_${billingKey}`];
    if (value) return value;
  }
  return CHARIOW_CONFIG.PRODUCT_ID;
}

/**
 * Construit l'URL de checkout Chariow pour un produit donné.
 * `refCommand` est passé en metadata pour être renvoyé dans le webhook.
 * Ajuster pattern URL quand Chariow fournit la spec officielle.
 */
export function buildCheckoutUrl(opts: {
  productId?: string;
  refCommand: string;
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
}): string {
  const productId = opts.productId || CHARIOW_CONFIG.PRODUCT_ID;
  if (!productId) {
    throw new Error('CHARIOW_PRODUCT_ID manquant');
  }
  const url = new URL(`${CHARIOW_CONFIG.CHECKOUT_URL}/${encodeURIComponent(productId)}`);
  url.searchParams.set('ref_command', opts.refCommand);
  if (opts.email) url.searchParams.set('email', opts.email);
  if (opts.successUrl) url.searchParams.set('success_url', opts.successUrl);
  if (opts.cancelUrl) url.searchParams.set('cancel_url', opts.cancelUrl);
  return url.toString();
}

/**
 * Vérifie la signature HMAC d'un webhook Chariow.
 * Algorithme à confirmer avec docs Chariow (placeholder HMAC-SHA256).
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!CHARIOW_CONFIG.WEBHOOK_SECRET) {
    // Pas de secret configuré → on accepte (dev). À durcir en prod.
    return true;
  }
  if (!signature) return false;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHmac, timingSafeEqual } = require('crypto') as typeof import('crypto');
  const expected = createHmac('sha256', CHARIOW_CONFIG.WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Génère une référence de commande unique
 */
export function generateRefCommand(prefix: string = 'CHW'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Récupère les détails d'une vente via l'API Chariow
 */
export async function getSale(saleId: string): Promise<any> {
  if (!CHARIOW_CONFIG.API_KEY) {
    throw new Error('CHARIOW_API_KEY non configurée');
  }

  const response = await fetch(`${CHARIOW_CONFIG.API_URL}/sales/${saleId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CHARIOW_CONFIG.API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chariow API error ${response.status}: ${errorText}`);
  }

  const json = await response.json();
  // L'API Chariow encapsule la ressource dans `data`. On déballe pour exposer
  // directement { status, amount, ... } aux appelants (webhook, status route).
  return (json && typeof json === 'object' && 'data' in json) ? (json as any).data : json;
}

// ============================================================================
// Checkout API — POST /checkout
// Crée une vente avec les coordonnées client déjà connues (email, nom,
// téléphone + pays) afin que la page Chariow → Moneroo soit préremplie et que
// l'utilisateur n'ait pas à ressaisir son pays / moyen de paiement.
// ============================================================================

export interface ChariowPhone {
  /** Numéro, chiffres uniquement (sans indicatif "+"). */
  number: string;
  /** Code pays ISO 3166-1 alpha-2 (ex. "CI"). cf. COUNTRY_ISO */
  country_code: string;
}

export interface InitCheckoutInput {
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: ChariowPhone;
  /** URL de retour après paiement. */
  redirectUrl?: string;
  /** Métadonnées renvoyées dans le Pulse (≤ 10 clés, ≤ 255 car. par valeur). */
  customMetadata?: Record<string, string>;
  /** Devise ISO 4217 (défaut : devise de la boutique). */
  paymentCurrency?: string;
}

export interface InitCheckoutResult {
  step?: 'payment' | 'completed' | 'already_purchased';
  status?: string;
  /** URL de paiement hébergée (null pour les produits gratuits). */
  checkoutUrl: string | null;
  transactionId?: string;
  /** Identifiant public de la vente (`sal_…`). */
  saleId?: string;
}

/**
 * Initialise un checkout côté API Chariow avec les coordonnées client
 * préremplies. Renvoie `checkoutUrl` (étape paiement Moneroo) vers laquelle
 * rediriger. Le `country_code` doit être ISO alpha-2 (voir COUNTRY_ISO).
 */
export async function initCheckout(input: InitCheckoutInput): Promise<InitCheckoutResult> {
  const body: Record<string, unknown> = {
    product_id: input.productId,
    email: input.email,
    first_name: input.firstName.slice(0, 50),
    last_name: (input.lastName || input.firstName || 'Client').slice(0, 50),
    phone: {
      // Numéro national seul : on retire tout indicatif saisi par l'utilisateur,
      // l'indicatif est porté par country_code (sinon Moneroo l'affiche en double).
      number: stripDialPrefix(input.phone.number, input.phone.country_code),
      country_code: input.phone.country_code,
    },
  };
  if (input.redirectUrl) body.redirect_url = input.redirectUrl;
  if (input.customMetadata) body.custom_metadata = input.customMetadata;
  if (input.paymentCurrency) body.payment_currency = input.paymentCurrency;

  const res = await chariowFetch<{ data?: any }>('/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = res?.data ?? {};
  return {
    step: data.step,
    status: data?.purchase?.status,
    checkoutUrl: data?.payment?.checkout_url ?? null,
    transactionId: data?.payment?.transaction_id,
    saleId: data?.purchase?.id,
  };
}

// ============================================================================
// License API — https://chariow.dev/en/guides/saas-license-integration
// ============================================================================

export interface ChariowLicense {
  status?: 'active' | 'expired' | 'revoked' | string;
  is_active?: boolean;
  is_expired?: boolean;
  expiresAt?: string;
  activationsRemaining?: number;
  productId?: string;
  customerEmail?: string;
  [key: string]: unknown;
}

export interface ChariowValidationResult {
  valid: boolean;
  license?: ChariowLicense;
  error?: string;
}

async function chariowFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!CHARIOW_CONFIG.API_KEY) {
    throw new Error('CHARIOW_API_KEY non configurée');
  }
  const res = await fetch(`${CHARIOW_CONFIG.API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHARIOW_CONFIG.API_KEY}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Chariow ${path} → HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json as T;
}

/** Valide une clé de licence Chariow. */
export async function validateLicense(licenseKey: string): Promise<ChariowValidationResult> {
  const data = await chariowFetch<ChariowLicense | ChariowValidationResult>(
    `/licenses/${encodeURIComponent(licenseKey)}`,
    { method: 'GET' }
  );
  if (data && typeof data === 'object' && 'valid' in data) {
    return data as ChariowValidationResult;
  }
  const lic = data as ChariowLicense;
  const valid = lic.is_active !== false && lic.is_expired !== true;
  return { valid, license: lic };
}

/** Active une licence sur un device. */
export async function activateLicense(
  licenseKey: string,
  deviceIdentifier: string
): Promise<ChariowLicense> {
  return chariowFetch<ChariowLicense>(
    `/licenses/${encodeURIComponent(licenseKey)}/activate`,
    {
      method: 'POST',
      body: JSON.stringify({ device_identifier: deviceIdentifier }),
    }
  );
}
