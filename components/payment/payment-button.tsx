/**
 * Composant: PaymentButton
 *
 * Ouvre une boite de dialogue qui collecte le numero Mobile Money + l'operateur,
 * puis initie un depot PawaPay. Selon l'operateur :
 *  - Wave SEN/CIV : redirection vers authorizationUrl
 *  - MTN / Orange / Moov / Airtel : PIN prompt sur le telephone du client
 *    puis polling du statut en tache de fond.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaymentButtonProps {
  sessionId: string;
  userEmail: string;
  amount: number;
  bootcampTitle: string;
  onSuccess?: () => void;
  className?: string;
}

/** Liste non exhaustive des providers PawaPay les plus utilises en Afrique de l'Ouest. */
const PAWAPAY_PROVIDERS = [
  { value: 'MTN_MOMO_CIV', label: 'MTN Mobile Money — Côte d’Ivoire' },
  { value: 'ORANGE_CIV', label: 'Orange Money — Côte d’Ivoire' },
  { value: 'MOOV_CIV', label: 'Moov Money — Côte d’Ivoire' },
  { value: 'WAVE_CIV', label: 'Wave — Côte d’Ivoire' },
  { value: 'WAVE_SEN', label: 'Wave — Sénégal' },
  { value: 'ORANGE_SEN', label: 'Orange Money — Sénégal' },
  { value: 'FREE_SEN', label: 'Free Money — Sénégal' },
  { value: 'ORANGE_BFA', label: 'Orange Money — Burkina Faso' },
  { value: 'MOOV_BFA', label: 'Moov Money — Burkina Faso' },
  { value: 'MTN_MOMO_BEN', label: 'MTN Mobile Money — Bénin' },
  { value: 'MOOV_BEN', label: 'Moov Money — Bénin' },
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState<string>('ORANGE_CIV');

  const handlePayment = async () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanedPhone || cleanedPhone.length < 9) {
      toast.error('Numéro de téléphone invalide');
      return;
    }
    if (!provider) {
      toast.error('Veuillez choisir un opérateur');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userEmail,
          phoneNumber: cleanedPhone,
          provider,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.details || 'Erreur lors de la création du paiement'
        );
      }

      sessionStorage.setItem('payment_ref', data.ref_command);
      sessionStorage.setItem('payment_session_id', sessionId);

      // Flow Wave : redirection vers authorizationUrl
      if (data.authorizationUrl || data.redirect_url) {
        window.location.href = data.authorizationUrl || data.redirect_url;
        return;
      }

      // Flow PIN : on redirige vers la page de suivi qui polle le statut
      toast.success(
        'Vérifiez votre téléphone et saisissez votre code PIN pour confirmer le paiement.'
      );
      onSuccess?.();
      window.location.href = `/payment/pending?ref_command=${encodeURIComponent(
        data.ref_command
      )}`;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Une erreur est survenue lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={className}
          size="lg"
          style={{
            background: 'linear-gradient(135deg, var(--violet), var(--blue))',
          }}
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Payer ({amount.toLocaleString('fr-FR')} FCFA)
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement Mobile Money</DialogTitle>
          <DialogDescription>
            {bootcampTitle} — {amount.toLocaleString('fr-FR')} FCFA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pawapay-provider">Opérateur Mobile Money</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="pawapay-provider">
                <SelectValue placeholder="Choisissez votre opérateur" />
              </SelectTrigger>
              <SelectContent>
                {PAWAPAY_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pawapay-phone">Numéro de téléphone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pawapay-phone"
                type="tel"
                inputMode="numeric"
                placeholder="ex. 2250707123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-9"
                disabled={isProcessing}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Saisissez votre numéro au format international, avec l’indicatif du
              pays (sans +).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isProcessing}
          >
            Annuler
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            style={{
              background: 'linear-gradient(135deg, var(--violet), var(--blue))',
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initialisation...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Confirmer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
