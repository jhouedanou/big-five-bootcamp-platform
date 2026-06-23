/**
 * Composant: PaymentButton
 *
 * Bouton minimal qui initie un paiement Chariow et redirige le client vers
 * le checkout hosté Chariow.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentButtonProps {
  sessionId: string;
  userEmail: string;
  amount: number;
  bootcampTitle: string;
  onSuccess?: () => void;
  className?: string;
}

export default function PaymentButton({
  sessionId,
  userEmail,
  amount,
  bootcampTitle,
  onSuccess,
  className,
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Erreur lors de la création du paiement');
      }

      sessionStorage.setItem('payment_ref', data.ref_command);
      sessionStorage.setItem('payment_session_id', sessionId);

      if (data.checkoutUrl || data.authorizationUrl || data.redirect_url) {
        window.location.href = data.checkoutUrl || data.authorizationUrl || data.redirect_url;
        return;
      }

      onSuccess?.();
      window.location.href = `/payment/pending?ref_command=${encodeURIComponent(data.ref_command)}`;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Une erreur est survenue lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isProcessing}
      className={className}
      size="lg"
      style={{ background: '#F2B33D' }}
      aria-label={`Payer ${amount.toLocaleString('fr-FR')} FCFA pour ${bootcampTitle}`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Redirection...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-5 w-5" />
          Payer ({amount.toLocaleString('fr-FR')} FCFA)
        </>
      )}
    </Button>
  );
}
