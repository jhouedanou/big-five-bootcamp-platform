/**
 * Composant: PaymentButton
 *
 * Bouton de paiement - redirige vers Moneroo checkout
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
        throw new Error(data.error || 'Erreur lors de la creation du paiement');
      }

      if (data.redirect_url) {
        sessionStorage.setItem('payment_ref', data.ref_command);
        sessionStorage.setItem('payment_session_id', sessionId);
        window.location.href = data.redirect_url;
      } else {
        throw new Error('URL de paiement non recue');
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Une erreur est survenue lors du paiement');
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isProcessing}
      className={className}
      size="lg"
      style={{
        background: 'linear-gradient(135deg, var(--violet), var(--blue))',
      }}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
