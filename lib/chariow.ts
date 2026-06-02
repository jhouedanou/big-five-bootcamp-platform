/**
 * Chariow Payment Integration
 * 
 * Configuration et helpers pour l'intégration Chariow (widget de paiement).
 */

export const CHARIOW_CONFIG = {
  API_KEY: process.env.CHARIOW_API_KEY || '',
  PRODUCT_ID: process.env.CHARIOW_PRODUCT_ID || '',
  WEBHOOK_SECRET: process.env.CHARIOW_WEBHOOK_SECRET || '',
  API_URL: process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1',
  // URL du checkout hosté Chariow. À ajuster selon docs Chariow réelles.
  // Pattern courant : https://checkout.chariow.com/{productId}?metadata=...
  CHECKOUT_URL: process.env.CHARIOW_CHECKOUT_URL || 'https://checkout.chariow.com',
};

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

  return response.json();
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
