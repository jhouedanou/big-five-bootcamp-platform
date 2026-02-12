/**
 * Page: /payment/success
 * 
 * Page de confirmation après paiement réussi
 * Vérifie le statut du paiement et affiche les détails de l'inscription
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Calendar, MapPin, User, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface PaymentData {
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

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Récupérer la référence de commande depuis l'URL ou sessionStorage
        const refFromUrl = searchParams.get('ref_command');
        const refFromStorage = sessionStorage.getItem('payment_ref');
        const ref_command = refFromUrl || refFromStorage;

        if (!ref_command) {
          setError('Référence de paiement introuvable');
          setLoading(false);
          return;
        }

        // Vérifier le statut du paiement
        const response = await fetch(`/api/payment/status/${ref_command}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Impossible de vérifier le paiement');
          setLoading(false);
          return;
        }

        if (data.payment.status !== 'completed') {
          setError('Le paiement n\'est pas encore validé. Veuillez patienter...');
          // Réessayer après 3 secondes
          setTimeout(verifyPayment, 3000);
          return;
        }

        setPaymentData(data);
        setLoading(false);

        // Nettoyer sessionStorage
        sessionStorage.removeItem('payment_ref');
        sessionStorage.removeItem('payment_session_id');

      } catch (err) {
        console.error('Error verifying payment:', err);
        setError('Une erreur est survenue lors de la vérification');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-violet-600" />
          <p className="text-lg font-medium">Vérification de votre paiement...</p>
          <p className="text-sm text-gray-600 mt-2">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
            <CardDescription>{error || 'Paiement introuvable'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/library')} className="w-full">
              Retour aux bootcamps
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { payment } = paymentData;
  const { session } = payment;
  const bootcamp = session.creative_library;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-white p-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* En-tête de confirmation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Paiement confirmé !</h1>
          <p className="text-gray-600">
            Votre inscription a été enregistrée avec succès
          </p>
        </div>

        {/* Détails du bootcamp */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{bootcamp.title}</CardTitle>
            <CardDescription>{bootcamp.tagline}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-violet-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Dates</p>
                  <p className="text-sm text-gray-600">
                    {new Date(session.start_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {' - '}
                    {new Date(session.end_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-violet-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Lieu</p>
                  <p className="text-sm text-gray-600">
                    {session.location}, {session.city}
                  </p>
                  <p className="text-xs text-gray-500">{session.format}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-violet-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Formateur</p>
                  <p className="text-sm text-gray-600">{session.trainer_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-violet-600 mt-0.5">📊</span>
                <div>
                  <p className="font-semibold text-sm">Niveau</p>
                  <p className="text-sm text-gray-600">{bootcamp.level}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails du paiement */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Détails du paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Montant payé</span>
                <span className="font-semibold">
                  {payment.amount.toLocaleString('fr-FR')} {payment.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Méthode de paiement</span>
                <span className="font-semibold">{payment.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Référence</span>
                <span className="font-mono text-sm">{payment.ref_command}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span>
                  {new Date(payment.completed_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prochaines étapes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Prochaines étapes</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-violet-100 text-violet-600 rounded-full text-sm font-semibold">
                  1
                </span>
                <p className="text-sm">
                  <strong>Vérifiez vos emails</strong> - Vous recevrez un email de confirmation avec
                  tous les détails de votre inscription
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-violet-100 text-violet-600 rounded-full text-sm font-semibold">
                  2
                </span>
                <p className="text-sm">
                  <strong>Préparez-vous</strong> - Consultez les prérequis et préparez votre matériel
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-violet-100 text-violet-600 rounded-full text-sm font-semibold">
                  3
                </span>
                <p className="text-sm">
                  <strong>Rejoignez-nous</strong> - Présentez-vous le jour J avec votre confirmation
                </p>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.print()}
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger la confirmation
          </Button>
          <Link href="/library" className="flex-1">
            <Button
              className="w-full"
              style={{
                background: 'linear-gradient(135deg, var(--violet), var(--blue))',
              }}
            >
              Explorer d'autres bootcamps
            </Button>
          </Link>
        </div>

        {/* Support */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Besoin d'aide ?{' '}
            <Link href="/contact" className="text-violet-600 hover:underline">
              Contactez notre support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
