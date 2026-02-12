/**
 * Types TypeScript pour l'intégration PayTech
 * 
 * Basés sur la documentation officielle :
 * https://doc.intech.sn/doc_paytech.php
 */

// ============================================
// TYPES SUPABASE (à ajouter dans lib/supabase.ts)
// ============================================

export interface PaymentRow {
  id: string;
  ref_command: string;
  paytech_token: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  client_phone: string | null;
  status: 'pending' | 'completed' | 'failed' | 'canceled' | 'refunded';
  session_id: string | null;
  user_email: string;
  item_name: string;
  item_description: string | null;
  ipn_data: any | null;
  initial_amount: number | null;
  final_amount: number | null;
  promo_enabled: boolean;
  promo_value_percent: number | null;
  env: 'test' | 'prod';
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface PaymentInsert {
  ref_command: string;
  amount: number;
  currency?: string;
  status?: 'pending' | 'completed' | 'failed' | 'canceled' | 'refunded';
  session_id?: string;
  user_email: string;
  item_name: string;
  item_description?: string;
  env?: 'test' | 'prod';
  paytech_token?: string;
  initial_amount?: number;
  final_amount?: number;
}

export interface PaymentUpdate {
  status?: 'pending' | 'completed' | 'failed' | 'canceled' | 'refunded';
  payment_method?: string;
  client_phone?: string;
  completed_at?: string;
  paytech_token?: string;
  ipn_data?: any;
  final_amount?: number;
  initial_amount?: number;
  promo_enabled?: boolean;
  promo_value_percent?: number;
}

// ============================================
// TYPES API PAYTECH
// ============================================

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
  custom_field?: string;
  target_payment?: string;
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

export interface PaytechTransfer {
  amount: number;
  destination_number: string;
  service: string;
  callback_url?: string;
  external_id?: string;
}

export interface PaytechTransferResponse {
  success: 0 | 1;
  message: string;
  transfer?: {
    created_at: string;
    token_transfer: string;
    id_transfer: string;
    amount: number;
    amount_xof: number;
    service_items_id: string;
    service_name: string;
    state: 'pending' | 'success' | 'failed';
    destination_number: string;
    validate_at: string | null;
    failed_at: string | null;
    fee_percent: number;
    rejected_at: string | null;
  };
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

export interface PaytechRefundResponse {
  success: 0 | 1;
  message: string;
}

// ============================================
// TYPES FRONTEND
// ============================================

export interface PaymentButtonProps {
  sessionId: string;
  userEmail: string;
  amount: number;
  bootcampTitle: string;
  onSuccess?: () => void;
  className?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  value: string;
  icon: string;
  description: string;
  countries: string[];
}

export interface PaymentSuccessData {
  payment: {
    id: string;
    ref_command: string;
    status: string;
    amount: number;
    currency: string;
    payment_method: string;
    client_phone: string;
    item_name: string;
    created_at: string;
    completed_at: string;
    session: {
      id: string;
      start_date: string;
      end_date: string;
      location: string;
      city: string;
      format: string;
      trainer_name: string;
      creative_library: {
        title: string;
        slug: string;
        tagline: string;
        level: string;
      };
    };
  };
}

// ============================================
// CONSTANTES
// ============================================

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  {
    id: 'orange_money',
    name: 'Orange Money',
    value: 'Orange Money',
    icon: '🟠',
    description: 'Paiement via Orange Money',
    countries: ['Sénégal', 'CI', 'Mali'],
  },
  {
    id: 'wave',
    name: 'Wave',
    value: 'Wave',
    icon: '💙',
    description: 'Paiement via Wave',
    countries: ['Sénégal', 'CI'],
  },
  {
    id: 'moov',
    name: 'Moov Money',
    value: 'Moov Money CI',
    icon: '🔵',
    description: 'Paiement via Moov Money',
    countries: ['CI', 'Bénin', 'Mali'],
  },
  {
    id: 'mtn',
    name: 'MTN Money',
    value: 'Mtn Money CI',
    icon: '🟡',
    description: 'Paiement via MTN Money',
    countries: ['CI', 'Bénin'],
  },
  {
    id: 'free_money',
    name: 'Free Money',
    value: 'Free Money',
    icon: '🔴',
    description: 'Paiement via Free Money',
    countries: ['Sénégal'],
  },
  {
    id: 'carte_bancaire',
    name: 'Carte Bancaire',
    value: 'Carte Bancaire',
    icon: '💳',
    description: 'Visa, Mastercard, etc.',
    countries: ['International'],
  },
] as const;

export type PaymentMethodValue = typeof PAYMENT_METHODS[number]['value'];

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];

export const IPN_EVENTS = {
  SALE_COMPLETE: 'sale_complete',
  SALE_CANCELED: 'sale_canceled',
  REFUND_COMPLETE: 'refund_complete',
} as const;

export type IPNEvent = typeof IPN_EVENTS[keyof typeof IPN_EVENTS];

// ============================================
// HELPERS DE VALIDATION
// ============================================

export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return Object.values(PAYMENT_STATUSES).includes(status as PaymentStatus);
}

export function isValidIPNEvent(event: string): event is IPNEvent {
  return Object.values(IPN_EVENTS).includes(event as IPNEvent);
}

export function isValidPaymentMethod(method: string): boolean {
  return PAYMENT_METHODS.some(m => m.value === method);
}

// ============================================
// UTILS
// ============================================

export function formatAmount(amount: number, currency: string = 'XOF'): string {
  return `${amount.toLocaleString('fr-FR')} ${currency}`;
}

export function formatPaymentMethod(method: string): string {
  const found = PAYMENT_METHODS.find(m => m.value === method);
  return found ? `${found.icon} ${found.name}` : method;
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-50';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'failed':
      return 'text-red-600 bg-red-50';
    case 'canceled':
      return 'text-gray-600 bg-gray-50';
    case 'refunded':
      return 'text-blue-600 bg-blue-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'completed':
      return 'Payé';
    case 'pending':
      return 'En attente';
    case 'failed':
      return 'Échoué';
    case 'canceled':
      return 'Annulé';
    case 'refunded':
      return 'Remboursé';
    default:
      return status;
  }
}

// ============================================
// TYPE GUARDS
// ============================================

export function isPaytechSuccess(response: PaytechPaymentResponse): response is PaytechPaymentResponse & { success: 1; token: string; redirect_url: string } {
  return response.success === 1 && !!response.token && !!response.redirect_url;
}

export function isPaytechError(response: PaytechPaymentResponse): response is PaytechPaymentResponse & { success: 0; message: string } {
  return response.success === 0;
}

export function isSaleComplete(ipn: PaytechIPN): boolean {
  return ipn.type_event === 'sale_complete';
}

export function isSaleCanceled(ipn: PaytechIPN): boolean {
  return ipn.type_event === 'sale_canceled';
}

export function isRefund(ipn: PaytechIPN): boolean {
  return ipn.type_event === 'refund_complete';
}
