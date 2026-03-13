/**
 * Page: /payment/success
 *
 * Page de confirmation apres paiement
 * Moneroo redirige avec ?paymentId=...&paymentStatus=...&ref_command=...
 * Verifie le statut aupres de Moneroo si le webhook n'a pas encore ete traite
 */

'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Calendar, User, Mail, Loader2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
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
    metadata?: {
      user_name?: string;
      user_email?: string;
      user_id?: string;
      item_name?: string;
      [key: string]: any;
    };
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
    } | null;
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
  const maxRetries = 5;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const verifyPayment = async (ref_command: string, attempt: number = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Premiere tentative : appeler directement le check Moneroo pour forcer la synchro
      if (attempt === 0) {
        try {
          const checkResponse = await fetch(`/api/payment/check/${ref_command}`, {
            method: 'POST',
          });
          const checkData = await checkResponse.json();
          if (checkData.success && checkData.payment?.status === 'completed') {
            // Paiement confirme par Moneroo, charger les details complets
            const statusResponse = await fetch(`/api/payment/status/${ref_command}`);
            const statusData = await statusResponse.json();
            if (statusData.success && statusData.payment?.status === 'completed') {
              setPaymentData(statusData);
              setLoading(false);
              sessionStorage.removeItem('payment_ref');
              sessionStorage.removeItem('payment_session_id');
              return;
            }
          }
        } catch (checkErr) {
          console.error('Moneroo check error:', checkErr);
        }
      }

      // Verifier le statut en base
      const response = await fetch(`/api/payment/status/${ref_command}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Impossible de verifier le paiement');
        setLoading(false);
        setShowManualInput(true);
        return;
      }

      if (data.payment.status === 'completed') {
        setPaymentData(data);
        setLoading(false);
        setPendingPayment(null);
        setShowPendingMessage(false);
        sessionStorage.removeItem('payment_ref');
        sessionStorage.removeItem('payment_session_id');
        return;
      }

      // Paiement en attente
      setPendingPayment(data.payment);
      setRetryCount(attempt + 1);

      if (attempt >= maxRetries) {
        setLoading(false);
        setShowPendingMessage(true);
        return;
      }

      // Reessayer apres 3 secondes
      timeoutRef.current = setTimeout(() => verifyPayment(ref_command, attempt + 1), 3000);

    } catch (err) {
      console.error('Error verifying payment:', err);
      setError('Une erreur est survenue lors de la verification');
      setLoading(false);
      setShowManualInput(true);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Moneroo redirige avec paymentId, paymentStatus et ref_command dans l'URL
    const refFromUrl = searchParams.get('ref_command') || searchParams.get('ref');
    const refFromStorage = sessionStorage.getItem('payment_ref');
    const ref_command = refFromUrl || refFromStorage;

    if (!ref_command) {
      setError('Reference de paiement introuvable');
      setLoading(false);
      setShowManualInput(true);
      return;
    }

    verifyPayment(ref_command, 0);
  }, [searchParams]);

  // Loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-blue-50 to-white">
        <Card className="max-w-md w-full shadow-xl border-2 mx-4">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-violet-600" />
              <p className="text-lg font-bold text-[#1A1F2B]">Verification de votre paiement...</p>
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

  // Paiement en attente
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
              Votre paiement a ete initie et est en attente de confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-violet-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Reference</span>
                <span className="text-sm font-bold font-mono">{pendingPayment.ref_command}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Montant</span>
                <span className="text-sm font-bold">{pendingPayment.amount?.toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Statut</span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600">
                  <Clock className="h-3 w-3" />
                  En attente
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-blue-800 mb-1">Que se passe-t-il ?</p>
                  <p className="text-blue-700">
                    Le paiement est en cours de validation. Cela peut prendre quelques minutes.
                    Vous recevrez une confirmation une fois le paiement valide.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => {
                  setLoading(true);
                  setShowPendingMessage(false);
                  setRetryCount(0);
                  verifyPayment(pendingPayment.ref_command, 0);
                }}
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 font-semibold"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Verifier a nouveau
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => router.push('/dashboard')} className="h-11 border-2 font-semibold">
                  Bibliotheque
                </Button>
                <Button variant="outline" onClick={() => router.push('/contact')} className="h-11 border-2 font-semibold">
                  Nous contacter
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-gray-500 pt-2">
              Conservez votre reference : <span className="font-mono font-bold">{pendingPayment.ref_command}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erreur
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
              Verification du paiement
            </CardTitle>
            <CardDescription className="text-base">
              {error || 'Paiement introuvable'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showManualInput && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-[#1A1F2B]">
                  Vous avez une reference de paiement ?
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    placeholder="Ex: SUB_XXXXX_XXXXX"
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
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verifier'}
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm text-center text-gray-600">
                Besoin d'aide ? Contactez-nous
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex-1 h-11 border-2">
                  Bibliotheque
                </Button>
                <Button variant="outline" onClick={() => router.push('/contact')} className="flex-1 h-11 border-2">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-white p-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Paiement confirme !</h1>
          <p className="text-gray-600">
            Votre {payment.item_name || 'abonnement'} a ete confirme avec succes
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Details du paiement</CardTitle>
            <CardDescription>Votre transaction a ete traitee avec succes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Reference</p>
                  <p className="text-sm text-gray-600 font-mono">{payment.ref_command}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-violet-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Montant</p>
                  <p className="text-sm text-gray-600">{payment.amount?.toLocaleString('fr-FR')} {payment.currency}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-violet-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Methode de paiement</p>
                  <p className="text-sm text-gray-600">{payment.payment_method}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-violet-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Date</p>
                  <p className="text-sm text-gray-600">
                    {new Date(payment.completed_at || payment.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-blue-800 mb-2">Acces a votre abonnement</p>
                <p className="text-blue-700">
                  Votre abonnement est maintenant actif ! Vous pouvez acceder a tous les contenus premium
                  immediatement depuis votre tableau de bord.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#80368D] to-[#29358B] hover:opacity-90">
              Acceder a la bibliotheque
            </Button>
          </Link>
          <Button variant="outline" className="flex-1 h-12" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Telecharger la confirmation
          </Button>
        </div>

        <Card className="mt-6 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold">Service Client Big Five</p>
              <p className="text-sm text-gray-600">+225 27 21 59 42 28</p>
              <p className="text-sm text-gray-600">contacts@bigfive.solutions</p>
              <p className="text-xs text-gray-500 mt-3">Disponible du lundi au vendredi, 9h - 18h</p>
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
