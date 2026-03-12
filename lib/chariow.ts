/**
 * Chariow Payment & License Gateway Service
 * Documentation: https://chariow.dev
 * 
 * Ce service gère l'intégration avec Chariow pour les paiements
 * et la gestion des licences d'abonnement.
 * 
 * Remplace l'ancien service PayTech.
 */

// ============================================
// TYPES
// ============================================

export interface ChariowPriceInfo {
  value: number;
  formatted: string;
  short: string;
  currency: string;
}

export interface ChariowProductResponse {
  data: {
    id: string;
    name: string;
    slug: string;
    description: string;
    type: string;
    status: string;
    pricing: {
      type: string;
      current_price: ChariowPriceInfo;
      price: ChariowPriceInfo;
      effective: ChariowPriceInfo;
      sale_price: ChariowPriceInfo | null;
    };
  };
}

export interface ChariowCheckoutRequest {
  product_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: {
    number: string;
    country_code: string;
  };
  discount_code?: string;
  redirect_url?: string;
  custom_metadata?: Record<string, string>;
  payment_currency?: string;
}

export interface ChariowCheckoutResponse {
  data: {
    step: 'payment' | 'completed' | 'already_purchased';
    message: string | null;
    purchase: {
      id: string;
      status: string;
      amount: {
        value: number;
        formatted: string;
        short: string;
        currency: string;
      };
      original_amount?: {
        value: number;
        formatted: string;
        short: string;
        currency: string;
      };
      discount_amount?: {
        value: number;
        formatted: string;
        short: string;
        currency: string;
      };
      payment?: {
        amount: {
          value: number;
          formatted: string;
          short: string;
          currency: string;
        };
        status: string;
        exchange_rate?: {
          value: number;
          formatted: string;
          short: string;
          currency: string;
        };
      };
      store?: {
        id: string;
        name: string;
      };
      product?: {
        id: string;
        name: string;
        slug: string;
      };
      customer?: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
      };
      discount?: {
        id: string;
        code: string;
        type: string;
        value: number;
      } | null;
      post_purchase?: {
        files: any[];
        licenses: any[];
        courses: any[];
      };
    } | null;
    payment: {
      checkout_url: string | null;
      transaction_id: string | null;
    } | null;
  };
}

export interface ChariowSaleResponse {
  message: string;
  data: {
    id: string;
    status: 'awaiting_payment' | 'completed' | 'failed' | 'abandoned' | 'settled';
    amount: {
      value: number;
      formatted: string;
      short: string;
      currency: string;
    };
    payment: {
      status: string;
      transaction_id: string;
      gateway: string;
      method?: {
        id: string;
        name: string;
        type: string;
      };
      amount: {
        value: number;
        formatted: string;
        short: string;
        currency: string;
      };
      failure_error: string | null;
    };
    product: {
      id: string;
      name: string;
      slug: string;
      type: string;
    };
    customer: {
      id: string;
      email: string;
      name: string;
      first_name: string;
      last_name: string;
    };
    custom_fields_values?: Record<string, string>;
    completed_at: string | null;
    failed_at: string | null;
    abandoned_at: string | null;
    created_at: string;
    updated_at: string;
  };
  errors: any[];
}

export interface ChariowPulsePayload {
  event: 'successful.sale' | 'abandoned.sale' | 'failed.sale' | 'license.activated' | 'license.expired' | 'license.issued' | 'license.revoked';
  sale?: {
    id: string;
    amount: {
      value: number;
      formatted: string;
      short: string;
      currency: string;
    };
    original_amount?: {
      value: number;
      formatted: string;
      short: string;
      currency: string;
    };
    status: string;
    created_at: string;
    completed_at: string | null;
    abandoned_at: string | null;
    failed_at: string | null;
    custom_metadata?: Record<string, string>;
  };
  license?: {
    id: string;
    key: string;
    status: string;
    source_type: string;
    activation_count: number;
    max_activations: number;
    activated_at: string | null;
    expires_at: string | null;
    expired_at: string | null;
    revoked_at: string | null;
    created_at: string;
  };
  product?: {
    id: string;
    name: string;
    url: string;
    price?: {
      value: number;
      formatted: string;
      short: string;
      currency: string;
    };
  };
  customer?: {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
  };
  store?: {
    id: string;
    name: string;
    url: string;
  };
  checkout?: {
    url: string;
  };
}

export interface ChariowLicense {
  id: string;
  status: 'pending_activation' | 'active' | 'expired' | 'revoked';
  customer: {
    id: string;
    name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
  };
  license: {
    key: string;
    masked_key: string;
  };
  is_active: boolean;
  is_expired: boolean;
  can_activate: boolean;
  activations: {
    count: number;
    max: number;
    remaining: number;
  };
  certificate_url: string | null;
  metadata: any | null;
  activated_at: string | null;
  expires_at: string | null;
  expired_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Récupère l'URL de base de l'application
 */
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

const CHARIOW_CONFIG = {
  API_KEY: process.env.CHARIOW_API_KEY || '',
  BASE_URL: 'https://api.chariow.com/v1',
  PRODUCT_ID: process.env.CHARIOW_PRODUCT_ID || '', // ID du produit abonnement dans Chariow
  WEBHOOK_URL: `${APP_BASE_URL}/api/payment/webhook`,
  SUCCESS_URL: `${APP_BASE_URL}/payment/success`,
  CANCEL_URL: `${APP_BASE_URL}/payment/cancel`,
};

console.log('Chariow Config:', {
  API_KEY: CHARIOW_CONFIG.API_KEY ? '✓ Configuré' : '✗ Manquant',
  BASE_URL: CHARIOW_CONFIG.BASE_URL,
  PRODUCT_ID: CHARIOW_CONFIG.PRODUCT_ID ? '✓ Configuré' : '✗ Manquant',
  APP_BASE_URL: APP_BASE_URL,
  WEBHOOK_URL: CHARIOW_CONFIG.WEBHOOK_URL,
});

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Headers d'authentification pour l'API Chariow
 */
function getHeaders(): Record<string, string> {
  if (!CHARIOW_CONFIG.API_KEY) {
    throw new Error('Chariow API key is not configured. Set CHARIOW_API_KEY in your .env file.');
  }
  return {
    'Authorization': `Bearer ${CHARIOW_CONFIG.API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Initier un checkout Chariow
 * 
 * @param params - Paramètres du checkout
 * @returns Réponse Chariow avec checkout_url ou statut
 */
export async function initCheckout(
  params: ChariowCheckoutRequest
): Promise<ChariowCheckoutResponse> {
  try {
    console.log('🚀 Envoi requête Chariow checkout:', {
      product_id: params.product_id,
      email: params.email,
      redirect_url: params.redirect_url,
    });

    const response = await fetch(`${CHARIOW_CONFIG.BASE_URL}/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erreur Chariow HTTP:', response.status, errorData);
      throw new Error(
        errorData.message || `Chariow API error: ${response.status}`
      );
    }

    const result: ChariowCheckoutResponse = await response.json();

    console.log('📥 Réponse Chariow:', {
      step: result.data.step,
      purchase_id: result.data.purchase?.id || null,
      checkout_url: result.data.payment?.checkout_url ? '✓' : '✗',
    });

    return result;
  } catch (error) {
    console.error('Chariow initCheckout error:', error);
    throw error;
  }
}

/**
 * Récupérer les détails d'une vente Chariow
 * 
 * @param saleId - ID de la vente (ex: sal_abc123xyz)
 * @returns Détails complets de la vente
 */
export async function getSale(saleId: string): Promise<ChariowSaleResponse> {
  try {
    const response = await fetch(`${CHARIOW_CONFIG.BASE_URL}/sales/${saleId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get sale: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Chariow getSale error:', error);
    throw error;
  }
}

/**
 * Valider une licence Chariow
 * 
 * @param licenseKey - Clé de licence (ex: ABC-123-XYZ-789)
 * @returns Données de la licence si valide
 */
export async function validateLicense(licenseKey: string): Promise<{
  valid: boolean;
  reason?: string;
  license?: ChariowLicense;
}> {
  try {
    const response = await fetch(
      `${CHARIOW_CONFIG.BASE_URL}/licenses/${licenseKey}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      return { valid: false, reason: 'Licence introuvable' };
    }

    const { data } = await response.json();

    if (!data.is_active) {
      return { valid: false, reason: 'La licence n\'est pas active' };
    }

    if (data.is_expired) {
      return { valid: false, reason: 'La licence a expiré' };
    }

    return { valid: true, license: data };
  } catch (error) {
    console.error('Chariow validateLicense error:', error);
    return { valid: false, reason: 'Erreur de validation' };
  }
}

/**
 * Activer une licence Chariow
 * 
 * @param licenseKey - Clé de licence
 * @param deviceIdentifier - Identifiant de l'appareil (optionnel)
 * @returns Résultat de l'activation
 */
export async function activateLicense(
  licenseKey: string,
  deviceIdentifier?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${CHARIOW_CONFIG.BASE_URL}/licenses/${licenseKey}/activate`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          device_identifier: deviceIdentifier || 'web-app',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        message: error.message || 'Activation échouée',
      };
    }

    return { success: true, message: 'Licence activée avec succès' };
  } catch (error) {
    console.error('Chariow activateLicense error:', error);
    return { success: false, message: 'Erreur lors de l\'activation' };
  }
}

/**
 * Révoquer une licence Chariow
 * 
 * @param licenseKey - Clé de licence
 * @param reason - Raison de la révocation
 * @returns Résultat de la révocation
 */
export async function revokeLicense(
  licenseKey: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${CHARIOW_CONFIG.BASE_URL}/licenses/${licenseKey}/revoke`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason: reason || 'Révoquée par l\'administrateur' }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, message: error.message || 'Révocation échouée' };
    }

    return { success: true, message: 'Licence révoquée avec succès' };
  } catch (error) {
    console.error('Chariow revokeLicense error:', error);
    return { success: false, message: 'Erreur lors de la révocation' };
  }
}

/**
 * Lister les licences d'un client
 * 
 * @param customerId - ID client Chariow (ex: cus_abc123)
 * @returns Liste des licences
 */
export async function listLicenses(filters?: {
  customer_id?: string;
  product_id?: string;
  status?: string;
}): Promise<ChariowLicense[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.product_id) params.append('product_id', filters.product_id);
    if (filters?.status) params.append('status', filters.status);

    const url = `${CHARIOW_CONFIG.BASE_URL}/licenses${params.toString() ? `?${params}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to list licenses: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Chariow listLicenses error:', error);
    return [];
  }
}

/**
 * Récupérer les détails d'un produit Chariow (y compris le prix)
 *
 * @param productId - ID ou slug du produit (ex: "prd_abc123" ou "creative-library")
 * @returns Détails du produit avec prix
 */
export async function getProduct(productId?: string): Promise<ChariowProductResponse> {
  const id = productId || CHARIOW_CONFIG.PRODUCT_ID;
  if (!id) {
    throw new Error('Product ID is required. Set CHARIOW_PRODUCT_ID in your .env file.');
  }

  try {
    const response = await fetch(`${CHARIOW_CONFIG.BASE_URL}/products/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get product: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Chariow getProduct error:', error);
    throw error;
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Formater un prix numérique avec séparateur de milliers (espace)
 * Ex: 25000 → "25 000"
 */
export function formatPrice(value: number): string {
  return value.toLocaleString('fr-FR');
}

/**
 * Générer une référence de commande unique pour le tracking interne
 */
export function generateRefCommand(prefix: string = 'BF'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Obtenir le product ID configuré pour l'abonnement
 */
export function getSubscriptionProductId(): string {
  const productId = CHARIOW_CONFIG.PRODUCT_ID;
  if (!productId) {
    throw new Error('CHARIOW_PRODUCT_ID is not configured. Set it in your .env file.');
  }
  return productId;
}

/**
 * Construire l'URL de redirection après succès avec les paramètres de tracking
 */
export function buildSuccessUrl(saleId: string, refCommand: string): string {
  const url = new URL(CHARIOW_CONFIG.SUCCESS_URL);
  url.searchParams.set('sale_id', saleId);
  url.searchParams.set('ref_command', refCommand);
  return url.toString();
}

/**
 * Construire un checkout pour un abonnement
 */
export async function createSubscriptionCheckout(params: {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  phoneCountryCode: string;
  refCommand: string;
  userId: string;
  redirectUrl?: string;
}): Promise<ChariowCheckoutResponse> {
  const productId = getSubscriptionProductId();
  
  return initCheckout({
    product_id: productId,
    email: params.email,
    first_name: params.firstName,
    last_name: params.lastName,
    phone: {
      number: params.phoneNumber.replace(/\D/g, ''),
      country_code: params.phoneCountryCode,
    },
    redirect_url: params.redirectUrl || buildSuccessUrl('', params.refCommand),
    custom_metadata: {
      ref_command: params.refCommand,
      user_id: params.userId,
      type: 'subscription',
    },
  });
}

export { CHARIOW_CONFIG };
