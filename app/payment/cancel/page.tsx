/**
 * Page: /payment/cancel
 * 
 * Page affichée quand l'utilisateur annule le paiement
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function PaymentCancelPage() {
  const router = useRouter();

  useEffect(() => {
    // Nettoyer sessionStorage
    const sessionId = sessionStorage.getItem('payment_session_id');
    
    return () => {
      sessionStorage.removeItem('payment_ref');
      sessionStorage.removeItem('payment_session_id');
    };
  }, []);

  const handleRetry = () => {
    const sessionId = sessionStorage.getItem('payment_session_id');
    if (sessionId) {
      // Rediriger vers la page de checkout pour réessayer
      router.push(`/content/${sessionId}`);
    } else {
      router.push('/library');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* En-tête d'annulation */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Paiement annulé</h1>
          <p className="text-gray-600">
            Votre transaction a été annulée
          </p>
        </div>

        {/* Carte d'information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Que s'est-il passé ?</CardTitle>
            <CardDescription>
              Vous avez annulé le processus de paiement ou la transaction n'a pas pu être finalisée.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Aucun montant n'a été débité</strong> de votre compte.
                Votre inscription n'a pas été finalisée.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Raisons possibles :</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Vous avez cliqué sur "Annuler" ou fermé la fenêtre</li>
                <li>Solde insuffisant sur votre compte mobile money</li>
                <li>Problème de connexion internet</li>
                <li>Délai d'attente dépassé</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Que faire maintenant ? */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Que faire maintenant ?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold text-sm">Vérifiez votre solde</p>
                  <p className="text-sm text-gray-600">
                    Assurez-vous d'avoir suffisamment de fonds sur votre compte
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-semibold text-sm">Rechargez si nécessaire</p>
                  <p className="text-sm text-gray-600">
                    Rechargez votre compte mobile money avant de réessayer
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="font-semibold text-sm">Réessayez le paiement</p>
                  <p className="text-sm text-gray-600">
                    Cliquez sur "Réessayer" pour relancer le processus
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full"
            size="lg"
            style={{
              background: 'linear-gradient(135deg, var(--violet), var(--blue))',
            }}
          >
            <RefreshCcw className="mr-2 h-5 w-5" />
            Réessayer le paiement
          </Button>

          <Link href="/library" className="block">
            <Button
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour aux bootcamps
            </Button>
          </Link>
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Vous rencontrez des difficultés ?
          </p>
          <Link href="/contact" className="text-sm text-violet-600 hover:underline font-semibold">
            Contactez notre équipe support →
          </Link>
        </div>

        {/* Informations de contact support */}
        <Card className="mt-6 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold">Service Client Big Five</p>
              <p className="text-sm text-gray-600">
                📞 +225 XX XX XX XX XX
              </p>
              <p className="text-sm text-gray-600">
                📧 support@bigfive.ci
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
