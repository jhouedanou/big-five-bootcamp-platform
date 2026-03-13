/**
 * Moneroo Payment Gateway Service
 * Documentation: https://docs.moneroo.io
 *
 * Ce service gere l'integration avec Moneroo pour les paiements
 * mobile money et carte bancaire en Afrique de l'Ouest
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface MonerooCustomer {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface MonerooInitPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  return_url: string;
  customer: MonerooCustomer;
  metadata?: Record<string, string>;
}

export interface MonerooInitPaymentResponse {
  message: string;
  data: {
    id: string;
    checkout_url: string;
  };
}

export interface MonerooPaymentData {
  id: string;
  status: 'initiated' | 'pending' | 'success' | 'failed' | 'cancelled';
  is_processed: boolean;
  processed_at: string | null;
  amount: number;
  currency: string;
  amount_formatted: string;
  description: string;
  return_url: string;
  environment: string;
  initiated_at: string;
  checkout_url: string;
  payment_phone_number: string | null;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
  method?: {
    name: string;
    code: string;
  };
  metadata: Record<string, string> | null;
}

export interface MonerooRetrieveResponse {
  success: boolean;
  message: string;
  data: MonerooPaymentData;
}

export interface MonerooWebhookPayload {
  event: 'payment.initiated' | 'payment.success' | 'payment.failed' | 'payment.cancelled';
  data: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
}

// ============================================================================
// Configuration
// ============================================================================

function getAppBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXTAUTH_URL
    || process.env.VERCEL_URL
    || 'http://localhost:3000';

  url = url.replace(/\/$/, '');

  if (url.includes('vercel.app') && !url.startsWith('https://')) {
    return `https://${url.replace(/^https?:\/\//, '')}`;
  }
  return url;
}

const APP_BASE_URL = getAppBaseUrl();

const MONEROO_CONFIG = {
  API_KEY: process.env.MONEROO_SECRET_KEY || '',
  BASE_URL: 'https://api.moneroo.io/v1',
  WEBHOOK_HASH: process.env.MONEROO_WEBHOOK_HASH || '',
  RETURN_URL: `${APP_BASE_URL}/payment/success`,
};

console.log('Moneroo Config:', {
  API_KEY: MONEROO_CONFIG.API_KEY ? `ok (${MONEROO_CONFIG.API_KEY.substring(0, 15)}...)` : 'MANQUANT',
  BASE_URL: MONEROO_CONFIG.BASE_URL,
  APP_BASE_URL,
  RETURN_URL: MONEROO_CONFIG.RETURN_URL,
});

// ============================================================================
// API Functions
// ============================================================================

/**
 * Initialise un paiement Moneroo et retourne l'URL de checkout
 */
export async function initializePayment(
  params: MonerooInitPaymentRequest
): Promise<MonerooInitPaymentResponse> {
  if (!MONEROO_CONFIG.API_KEY) {
    throw new Error('Moneroo API key is not configured. Check MONEROO_SECRET_KEY in .env');
  }

  console.log('Moneroo: initializing payment', {
    amount: params.amount,
    currency: params.currency,
    customer_email: params.customer.email,
  });

  const response = await fetch(`${MONEROO_CONFIG.BASE_URL}/payments/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MONEROO_CONFIG.API_KEY}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Moneroo init error:', response.status, errorText);
    throw new Error(`Moneroo API error: ${response.status} - ${errorText}`);
  }

  const result: MonerooInitPaymentResponse = await response.json();

  console.log('Moneroo: payment initialized', {
    id: result.data.id,
    checkout_url: result.data.checkout_url ? 'ok' : 'missing',
  });

  return result;
}

/**
 * Recupere les details d'un paiement Moneroo
 */
export async function retrievePayment(paymentId: string): Promise<MonerooRetrieveResponse> {
  if (!MONEROO_CONFIG.API_KEY) {
    throw new Error('Moneroo API key is not configured');
  }

  const response = await fetch(`${MONEROO_CONFIG.BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MONEROO_CONFIG.API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Moneroo retrieve error:', response.status, errorText);
    throw new Error(`Moneroo retrieve error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Verifie la signature d'un webhook Moneroo (HMAC-SHA256)
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!MONEROO_CONFIG.WEBHOOK_HASH) {
    console.error('MONEROO_WEBHOOK_HASH not configured');
    return false;
  }

  const computed = crypto
    .createHmac('sha256', MONEROO_CONFIG.WEBHOOK_HASH)
    .update(payload)
    .digest('hex');

  return computed === signature;
}

/**
 * Helper: Generer une reference de commande unique
 */
export function generateRefCommand(prefix: string = 'BF'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Helper: Retourne l'URL de retour
 */
export function getReturnUrl(refCommand: string): string {
  return `${MONEROO_CONFIG.RETURN_URL}?ref_command=${encodeURIComponent(refCommand)}`;
}
