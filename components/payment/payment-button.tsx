/**
 * Composant: PaymentButton
 * 
 * Bouton de paiement avec sélection de méthode mobile money
 * Gère la création de la demande de paiement et la redirection vers PayTech
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentButtonProps {
  sessionId: string;
  userEmail: string;
  amount: number;
  bootcampTitle: string;
  onSuccess?: () => void;
  className?: string;
}

// Méthodes de paiement populaires en Côte d'Ivoire et Afrique de l'Ouest
const PAYMENT_METHODS = [
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
];

export default function PaymentButton({
  sessionId,
  userEmail,
  amount,
  bootcampTitle,
  onSuccess,
  className,
}: PaymentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }

    setIsProcessing(true);

    try {
      // Appel à l'API pour créer la demande de paiement
      const response = await fetch('/api/payment/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userEmail,
          paymentMethod: selectedMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      // Rediriger vers la page de paiement PayTech
      if (data.redirect_url) {
        // Stocker la référence de commande dans sessionStorage pour la page de retour
        sessionStorage.setItem('payment_ref', data.ref_command);
        sessionStorage.setItem('payment_session_id', sessionId);
        
        // Redirection vers PayTech
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
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={className}
        size="lg"
        style={{
          background: 'linear-gradient(135deg, var(--violet), var(--blue))',
        }}
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Procéder au paiement ({amount.toLocaleString('fr-FR')} FCFA)
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Choisir une méthode de paiement</DialogTitle>
            <DialogDescription>
              Sélectionnez votre moyen de paiement pour finaliser votre inscription à{' '}
              <strong>{bootcampTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
              <div className="grid gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <div key={method.id} className="relative">
                    <RadioGroupItem
                      value={method.value}
                      id={method.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={method.id}
                      className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-4 cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 transition-all"
                    >
                      <span className="text-2xl">{method.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold">{method.name}</div>
                        <div className="text-sm text-gray-600">
                          {method.description}
                        </div>
                      </div>
                      <Smartphone className="h-5 w-5 text-gray-400" />
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            {/* Informations de sécurité */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <span className="text-lg">🔒</span>
                <div>
                  <p className="font-semibold mb-1">Paiement 100% sécurisé</p>
                  <p className="text-xs text-blue-700">
                    Vos informations de paiement sont traitées de manière sécurisée par PayTech.
                    Nous ne stockons pas vos données bancaires.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePayment}
              disabled={!selectedMethod || isProcessing}
              style={{
                background: selectedMethod
                  ? 'linear-gradient(135deg, var(--violet), var(--blue))'
                  : undefined,
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  Confirmer ({amount.toLocaleString('fr-FR')} FCFA)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
