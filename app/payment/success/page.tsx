/**
 * Page: /payment/success
 * 
 * Page de confirmation après paiement réussi
 * Vérifie le statut du paiement et affiche les détails de l'inscription
 */

'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Calendar, MapPin, User, Mail, Loader2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
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

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualRef, setManualRef] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const maxRetries = 5; // Arrêter après 5 tentatives (15 secondes)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const verifyPayment = async (ref_command: string, attempt: number = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier le statut du paiement
      const response = await fetch(`/api/payment/status/${ref_command}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Impossible de vérifier le paiement');
        setLoading(false);
        setShowManualInput(true);
        return;
      }

      // Paiement complété !
      if (data.payment.status === 'completed') {
        setPaymentData(data);
        setLoading(false);
        setPendingPayment(null);
        setShowPendingMessage(false);
        // Nettoyer sessionStorage
        sessionStorage.removeItem('payment_ref');
        sessionStorage.removeItem('payment_session_id');
        return;
      }

      // Paiement en attente
      setPendingPayment(data.payment);
      setRetryCount(attempt + 1);

      // Si on a atteint le max de tentatives, afficher le message pending
      if (attempt >= maxRetries) {
        setLoading(false);
        setShowPendingMessage(true);
        return;
      }

      // Réessayer après 3 secondes
      timeoutRef.current = setTimeout(() => verifyPayment(ref_command, attempt + 1), 3000);

    } catch (err) {
      console.error('Error verifying payment:', err);
      setError('Une erreur est survenue lors de la vérification');
      setLoading(false);
      setShowManualInput(true);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Récupérer la référence de commande depuis l'URL ou sessionStorage
    const refFromUrl = searchParams.get('ref_command') || searchParams.get('ref');
    const refFromStorage = sessionStorage.getItem('payment_ref');
    const ref_command = refFromUrl || refFromStorage;

    if (!ref_command) {
      setError('Référence de paiement introuvable');
      setLoading(false);
      setShowManualInput(true);
      return;
    }

    verifyPayment(ref_command, 0);
  }, [searchParams]);

  // Affichage du loader avec progression
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-blue-50 to-white">
        <Card className="max-w-md w-full shadow-xl border-2 mx-4">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-violet-600" />
              <p className="text-lg font-bold text-[#1A1F2B]">Vérification de votre paiement...</p>
              <p className="text-sm text-gray-600 mt-2">Veuillez patienter</p>
              {retryCount > 0 && (
                <div className="mt-4">
                  <div className="flex justify-center gap-1 mb-2">
                    {[...Array(maxRetries)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-8 rounded-full transition-colors ${
                          i < retryCount ? 'bg-violet-600' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Tentative {retryCount}/{maxRetries}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Paiement en attente après plusieurs tentatives
  if (showPendingMessage && pendingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-blue-50 to-white">
        <Card className="max-w-md w-full shadow-xl border-2">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl font-bold text-[#1A1F2B]">
              Paiement en cours de traitement
            </CardTitle>
            <CardDescription className="text-base">
              Votre paiement a été initié et est en attente de confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Détails du paiement */}
            <div className="bg-violet-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Référence</span>
                <span className="text-sm font-bold font-mono">{pendingPayment.ref_command}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Montant</span>
                <span className="text-sm font-bold">{pendingPayment.amount?.toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Méthode</span>
                <span className="text-sm font-bold">{pendingPayment.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Statut</span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600">
                  <Clock className="h-3 w-3" />
                  En attente
                </span>
              </div>
            </div>

            {/* Message explicatif */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-blue-800 mb-1">Que se passe-t-il ?</p>
                  <p className="text-blue-700">
                    Le paiement est en cours de validation par l'opérateur mobile. 
                    Cela peut prendre quelques minutes. Vous recevrez une confirmation 
                    par SMS/email une fois le paiement validé.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button 
                onClick={() => {
                  setShowPendingMessage(false);
                  setRetryCount(0);
                  verifyPayment(pendingPayment.ref_command, 0);
                }}
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 font-semibold"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Vérifier à nouveau
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')} 
                  className="h-11 border-2 font-semibold"
                >
                  Bibliothèque
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/contact')} 
                  className="h-11 border-2 font-semibold"
                >
                  Nous contacter
                </Button>
              </div>
            </div>

            {/* Note */}
            <p className="text-xs text-center text-gray-500 pt-2">
              Conservez votre référence : <span className="font-mono font-bold">{pendingPayment.ref_command}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-blue-50 to-white">
        <Card className="max-w-md w-full shadow-xl border-2">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <CardTitle className="text-xl font-bold text-[#1A1F2B]">
              {error === 'Référence de paiement introuvable' 
                ? 'Vérification du paiement' 
                : 'Erreur de vérification'}
            </CardTitle>
            <CardDescription className="text-base">
              {error || 'Paiement introuvable'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showManualInput && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-[#1A1F2B]">
                  Vous avez une référence de paiement ?
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    placeholder="Ex: PAY-XXXXX-XXXXX"
                    className="flex-1 h-11 px-4 rounded-lg border-2 border-gray-200 focus:border-violet-500 focus:outline-none text-sm font-medium"
                  />
                  <Button 
                    onClick={() => {
                      if (manualRef.trim()) {
                        verifyPayment(manualRef.trim());
                      }
                    }}
                    disabled={!manualRef.trim() || loading}
                    className="h-11 px-6 bg-violet-600 hover:bg-violet-700"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Vérifier'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  La référence vous a été envoyée par SMS ou email lors du paiement
                </p>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm text-center text-gray-600">
                Besoin d'aide ? Contactez-nous
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')} 
                  className="flex-1 h-11 border-2"
                >
                  Bibliothèque
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/contact')} 
                  className="flex-1 h-11 border-2"
                >
                  Contact
                </Button>
              </div>
            </div>
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

        {/* Informations de contact support */}
        <Card className="mt-6 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold">Service Client Big Five</p>
              <p className="text-sm text-gray-600">
                📞 +225 27 21 59 42 28
              </p>
              <p className="text-sm text-gray-600">
                📧 contacts@bigfive.solutions
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Disponible du lundi au vendredi, 9h - 18h
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-violet-600" />
            <p className="text-lg font-medium">Chargement...</p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
