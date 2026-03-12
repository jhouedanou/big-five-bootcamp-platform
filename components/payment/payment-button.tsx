/**
 * Composant: PaymentButton
 * 
 * Bouton de paiement simplifié — redirige vers la page de checkout Chariow
 * Chariow gère la sélection de méthode de paiement sur sa propre page
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
  currency?: string;
  bootcampTitle: string;
  onSuccess?: () => void;
  className?: string;
}

export default function PaymentButton({
  sessionId,
  userEmail,
  amount,
  currency = 'XOF',
  bootcampTitle,
  onSuccess,
  className,
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Appel à l'API pour créer le checkout Chariow
      const response = await fetch('/api/payment/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      // Rediriger vers la page de checkout Chariow
      if (data.redirect_url) {
        // Stocker la référence de commande dans sessionStorage pour la page de retour
        sessionStorage.setItem('payment_ref', data.ref_command);
        sessionStorage.setItem('payment_session_id', sessionId);
        
        // Redirection vers Chariow checkout
        window.location.href = data.redirect_url;
      } else {
        throw new Error('URL de paiement non reçue');
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
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Redirection vers le paiement...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-5 w-5" />
          Procéder au paiement ({amount.toLocaleString('fr-FR')} {currency})
        </>
      )}
    </Button>
  );
}
