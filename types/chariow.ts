/**
 * Types TypeScript pour l'intégration Chariow
 * 
 * Basés sur la documentation officielle :
 * https://chariow.dev
 * 
 * Remplace les anciens types PayTech.
 */

// ============================================
// TYPES SUPABASE (table payments)
// ============================================

export interface PaymentRow {
  id: string;
  ref_command: string;
  chariow_sale_id: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  client_phone: string | null;
  status: 'pending' | 'completed' | 'failed' | 'canceled' | 'refunded';
  session_id: string | null;
  user_email: string;
  item_name: string;
  item_description: string | null;
  webhook_data: any | null;
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
  chariow_sale_id?: string;
  initial_amount?: number;
  final_amount?: number;
}

export interface PaymentUpdate {
  status?: 'pending' | 'completed' | 'failed' | 'canceled' | 'refunded';
  payment_method?: string;
  client_phone?: string;
  completed_at?: string;
  chariow_sale_id?: string;
  webhook_data?: any;
  final_amount?: number;
  initial_amount?: number;
  promo_enabled?: boolean;
  promo_value_percent?: number;
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

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];

export const CHARIOW_EVENTS = {
  SUCCESSFUL_SALE: 'successful.sale',
  ABANDONED_SALE: 'abandoned.sale',
  FAILED_SALE: 'failed.sale',
  LICENSE_ACTIVATED: 'license.activated',
  LICENSE_EXPIRED: 'license.expired',
  LICENSE_ISSUED: 'license.issued',
  LICENSE_REVOKED: 'license.revoked',
} as const;

export type ChariowEvent = typeof CHARIOW_EVENTS[keyof typeof CHARIOW_EVENTS];

// ============================================
// HELPERS DE VALIDATION
// ============================================

export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return Object.values(PAYMENT_STATUSES).includes(status as PaymentStatus);
}

export function isValidChariowEvent(event: string): event is ChariowEvent {
  return Object.values(CHARIOW_EVENTS).includes(event as ChariowEvent);
}

// ============================================
// UTILS
// ============================================

export function formatAmount(amount: number, currency: string = 'XOF'): string {
  return `${amount.toLocaleString('fr-FR')} ${currency}`;
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
