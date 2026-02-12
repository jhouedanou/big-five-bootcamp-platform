/**
 * PayTech Payment Gateway Service
 * Documentation: https://doc.intech.sn/doc_paytech.php
 * 
 * Ce service gère l'intégration avec PayTech pour les paiements mobile money
 * (Orange Money, Wave, Free Money, etc.)
 */

import crypto from 'crypto';

// Types PayTech basés sur la documentation officielle
export interface PaytechPaymentRequest {
  item_name: string;
  item_price: number;
  currency?: 'XOF' | 'EUR' | 'USD' | 'CAD' | 'GBP' | 'MAD';
  ref_command: string;
  command_name: string;
  env?: 'test' | 'prod';
  ipn_url?: string;
  success_url?: string;
  cancel_url?: string;
  custom_field?: string; // JSON string
  target_payment?: string; // Ex: "Orange Money" ou "Orange Money, Wave, Free Money"
  refund_notif_url?: string;
}

export interface PaytechPaymentResponse {
  success: 0 | 1;
  token?: string;
  redirect_url?: string;
  redirectUrl?: string;
  message?: string;
}

export interface PaytechIPN {
  type_event: 'sale_complete' | 'sale_canceled' | 'refund_complete';
  custom_field?: string;
  ref_command: string;
  item_name: string;
  item_price: number;
  initial_item_price?: number;
  final_item_price?: number;
  promo_enabled?: boolean;
  promo_value_percent?: number;
  currency: string;
  command_name: string;
  token: string;
  env: 'test' | 'prod';
  payment_method: string;
  client_phone: string;
  api_key_sha256: string;
  api_secret_sha256: string;
  hmac_compute?: string;
}

export interface PaytechStatusResponse {
  success: 0 | 1;
  transaction?: {
    status: 'pending' | 'completed' | 'failed' | 'canceled';
    amount: number;
    payment_method: string;
    client_phone: string;
    ref_command: string;
  };
  message?: string;
}

/**
 * Configuration PayTech depuis les variables d'environnement
 */
const PAYTECH_CONFIG = {
  API_KEY: process.env.PAYTECH_API_KEY || '',
  API_SECRET: process.env.PAYTECH_API_SECRET || '',
  BASE_URL: 'https://paytech.sn/api',
  ENV: (process.env.PAYTECH_ENV || 'test') as 'test' | 'prod',
  IPN_URL: `${process.env.NEXTAUTH_URL}/api/payment/ipn`,
  SUCCESS_URL: `${process.env.NEXTAUTH_URL}/payment/success`,
  CANCEL_URL: `${process.env.NEXTAUTH_URL}/payment/cancel`,
};

console.log('PayTech Config:', {
  API_KEY: PAYTECH_CONFIG.API_KEY ? '✓ Configuré' : '✗ Manquant',
  API_SECRET: PAYTECH_CONFIG.API_SECRET ? '✓ Configuré' : '✗ Manquant',
  ENV: PAYTECH_CONFIG.ENV,
  BASE_URL: PAYTECH_CONFIG.BASE_URL,
});

/**
 * MÉTHODE 1: Demande de paiement
 * Crée une demande de paiement et retourne l'URL de redirection vers PayTech
 * 
 * @param params - Paramètres de paiement conformes à la doc PayTech
 * @returns Réponse avec token et redirect_url si succès
 */
export async function requestPayment(
  params: PaytechPaymentRequest
): Promise<PaytechPaymentResponse> {
  try {
    // Validation des clés API
    if (!PAYTECH_CONFIG.API_KEY || !PAYTECH_CONFIG.API_SECRET) {
      throw new Error('PayTech API credentials are not configured. Check your .env file.');
    }

    // Préparation des données avec valeurs par défaut
    const paymentData: PaytechPaymentRequest = {
      item_name: params.item_name,
      item_price: params.item_price,
      currency: params.currency || 'XOF',
      ref_command: params.ref_command,
      command_name: params.command_name,
      env: params.env || PAYTECH_CONFIG.ENV,
      ipn_url: params.ipn_url || PAYTECH_CONFIG.IPN_URL,
      success_url: params.success_url || PAYTECH_CONFIG.SUCCESS_URL,
      cancel_url: params.cancel_url || PAYTECH_CONFIG.CANCEL_URL,
      custom_field: params.custom_field,
      target_payment: params.target_payment,
      refund_notif_url: params.refund_notif_url,
    };

    // Appel à l'API PayTech
    console.log('🚀 Envoi requête PayTech:', {
      url: `${PAYTECH_CONFIG.BASE_URL}/payment/request-payment`,
      item_name: paymentData.item_name,
      item_price: paymentData.item_price,
      ref_command: paymentData.ref_command,
      env: paymentData.env,
    });

    const response = await fetch(`${PAYTECH_CONFIG.BASE_URL}/payment/request-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API_KEY': PAYTECH_CONFIG.API_KEY,
        'API_SECRET': PAYTECH_CONFIG.API_SECRET,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur PayTech HTTP:', response.status, errorText);
      throw new Error(`PayTech API error: ${response.status} - ${errorText}`);
    }

    const result: PaytechPaymentResponse = await response.json();
    
    console.log('📥 Réponse PayTech:', {
      success: result.success,
      token: result.token ? '✓' : '✗',
      redirect_url: result.redirect_url || result.redirectUrl ? '✓' : '✗',
    });

    if (result.success !== 1) {
      throw new Error(result.message || 'PayTech payment request failed');
    }

    return result;
  } catch (error) {
    console.error('PayTech requestPayment error:', error);
    throw error;
  }
}

/**
 * MÉTHODE 2: Vérification IPN (Webhook)
 * Vérifie l'authenticité d'une notification PayTech avec 2 méthodes de sécurité
 * 
 * Méthode 1 (Recommandée): HMAC-SHA256
 * Méthode 2 (Classique): SHA256 des clés API
 * 
 * @param ipnData - Données IPN reçues de PayTech
 * @returns true si l'IPN est authentique
 */
export function verifyIPN(ipnData: PaytechIPN): boolean {
  try {
    // Méthode 1: Vérification HMAC-SHA256 (recommandée)
    if (ipnData.hmac_compute) {
      const message = `${ipnData.item_price}|${ipnData.ref_command}|${PAYTECH_CONFIG.API_KEY}`;
      const hmac = crypto.createHmac('sha256', PAYTECH_CONFIG.API_SECRET);
      hmac.update(message);
      const expectedHmac = hmac.digest('hex');

      const isValidHmac = expectedHmac === ipnData.hmac_compute;
      if (isValidHmac) {
        console.log('✅ PayTech IPN verified via HMAC-SHA256');
        return true;
      }
    }

    // Méthode 2: Vérification SHA256 des clés API (fallback)
    const expectedKeyHash = crypto
      .createHash('sha256')
      .update(PAYTECH_CONFIG.API_KEY)
      .digest('hex');
    
    const expectedSecretHash = crypto
      .createHash('sha256')
      .update(PAYTECH_CONFIG.API_SECRET)
      .digest('hex');

    const isValidSha256 = 
      expectedKeyHash === ipnData.api_key_sha256 &&
      expectedSecretHash === ipnData.api_secret_sha256;

    if (isValidSha256) {
      console.log('✅ PayTech IPN verified via SHA256');
      return true;
    }

    console.error('❌ PayTech IPN verification failed');
    return false;
  } catch (error) {
    console.error('PayTech verifyIPN error:', error);
    return false;
  }
}

/**
 * MÉTHODE 3: Vérifier le statut d'un paiement
 * Permet de récupérer le statut actuel d'une transaction PayTech
 * 
 * @param token - Token PayTech reçu lors de la demande de paiement
 * @returns Statut de la transaction
 */
export async function getPaymentStatus(token: string): Promise<PaytechStatusResponse> {
  try {
    const response = await fetch(
      `${PAYTECH_CONFIG.BASE_URL}/payment/get-status?token_payment=${token}`,
      {
        method: 'GET',
        headers: {
          'API_KEY': PAYTECH_CONFIG.API_KEY,
          'API_SECRET': PAYTECH_CONFIG.API_SECRET,
        },
      }
    );

    const result: PaytechStatusResponse = await response.json();
    return result;
  } catch (error) {
    console.error('PayTech getPaymentStatus error:', error);
    throw error;
  }
}

/**
 * MÉTHODE 4: Remboursement
 * Initie un remboursement pour une transaction PayTech
 * 
 * @param ref_command - Référence de la commande à rembourser
 * @returns Résultat du remboursement
 */
export async function refundPayment(ref_command: string): Promise<{
  success: 0 | 1;
  message: string;
}> {
  try {
    const formData = new URLSearchParams();
    formData.append('ref_command', ref_command);

    const response = await fetch(`${PAYTECH_CONFIG.BASE_URL}/payment/refund-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'API_KEY': PAYTECH_CONFIG.API_KEY,
        'API_SECRET': PAYTECH_CONFIG.API_SECRET,
      },
      body: formData.toString(),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('PayTech refundPayment error:', error);
    throw error;
  }
}

/**
 * Helper: Générer une référence de commande unique
 * Format: BOOTCAMP_[timestamp]_[random]
 */
export function generateRefCommand(prefix: string = 'BOOTCAMP'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Helper: Méthodes de paiement disponibles (source: doc PayTech)
 */
export const PAYMENT_METHODS = [
  'Orange Money',
  'Orange Money CI',
  'Orange Money ML',
  'Mtn Money CI',
  'Moov Money CI',
  'Moov Money ML',
  'Wave',
  'Wave CI',
  'Wizall',
  'Carte Bancaire',
  'Emoney',
  'Tigo Cash',
  'Free Money',
  'Moov Money BJ',
  'Mtn Money BJ',
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];
