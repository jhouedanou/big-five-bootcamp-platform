"use client"

/**
 * Page: /payment/pending?ref_command=...
 *
 * Page d'attente affichée pendant qu'un paiement Chariow est en cours.
 * Poll l'API jusqu'à recevoir un statut final.
 */

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, Smartphone, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const MAX_POLL_MS = 5 * 60 * 1000 // 5 minutes
const POLL_INTERVAL_MS = 4000

type Status = "pending" | "completed" | "failed" | "rejected" | "canceled" | "timeout"

function PaymentPendingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCommand = searchParams.get("ref_command") || ""

  const [status, setStatus] = useState<Status>("pending")
  const [gatewayStatus, setGatewayStatus] = useState<string | undefined>()
  const [failureMessage, setFailureMessage] = useState<string | undefined>()
  const [authUrl, setAuthUrl] = useState<string | undefined>()
  const [paymentType, setPaymentType] = useState<string | undefined>()
  const [brandRequestId, setBrandRequestId] = useState<string | undefined>()
  const [elapsed, setElapsed] = useState(0)
  // Incrémenté par "Vérifier à nouveau" pour relancer le cycle de polling.
  const [pollNonce, setPollNonce] = useState(0)
  const startedAt = useRef(Date.now())

  // Cible du bouton "Réessayer" : un paiement de devis (brand_request) doit
  // revenir sur sa page de paiement, pas sur la page d'abonnement.
  const retryHref =
    paymentType === "brand_request" && brandRequestId
      ? `/pay/brand-request/${brandRequestId}`
      : "/subscribe"

  useEffect(() => {
    if (!refCommand) return
    let cancelled = false
    // Réinitialise la fenêtre à chaque (re)lancement du cycle de polling.
    startedAt.current = Date.now()

    async function poll() {
      try {
        const res = await fetch(`/api/payment/check/${encodeURIComponent(refCommand)}`, {
          method: "POST",
          cache: "no-store",
        })
        const data = await res.json()
        if (cancelled) return

        const s = data?.payment?.status as Status | undefined
        if (s) setStatus(s)
        if (data?.payment?.chariow_status || data?.payment?.gateway_status) {
          setGatewayStatus(data.payment.chariow_status || data.payment.gateway_status)
        }
        if (data?.payment?.authorizationUrl) setAuthUrl(data.payment.authorizationUrl)
        if (data?.payment?.failureReason?.failureMessage) {
          setFailureMessage(data.payment.failureReason.failureMessage)
        }
        if (data?.payment?.type) setPaymentType(data.payment.type)
        if (data?.payment?.brandRequestId) setBrandRequestId(data.payment.brandRequestId)

        if (s === "completed") {
          setTimeout(() => router.push(`/payment/success?ref_command=${encodeURIComponent(refCommand)}`), 1200)
          return
        }
        // États terminaux négatifs : on arrête de poller.
        if (s === "failed" || s === "rejected" || s === "canceled") {
          return
        }
      } catch (err) {
        console.error("Polling error", err)
      }

      if (Date.now() - startedAt.current < MAX_POLL_MS && !cancelled) {
        setElapsed(Date.now() - startedAt.current)
        setTimeout(poll, POLL_INTERVAL_MS)
      } else if (!cancelled) {
        // Fenêtre de 5 min écoulée sans statut final : on sort du spinner et on
        // affiche un écran terminal "non confirmé" (le webhook peut encore
        // arriver et activer l'accès plus tard).
        setStatus("timeout")
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [refCommand, router, pollNonce])

  if (!refCommand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center">
          <p className="text-[#0F0F0F]/70">Référence de paiement manquante.</p>
          <Link href="/dashboard" className="text-[#F2B33D] underline mt-4 inline-block">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#F5F5F5]">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F2B33D]">
              <img src="/logo.png" alt="Laveiye" className="relative" />
            </div>
            <span className="font-bold text-[#0F0F0F]">Laveiye</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        {status === "pending" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F2B33D]/10">
              <Smartphone className="h-10 w-10 text-[#F2B33D]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F0F0F]">
              Paiement en cours
            </h1>
            <p className="mt-3 text-[#0F0F0F]/70">
              Finalisez votre paiement sur la page Chariow. Cette page
              se mettra à jour automatiquement après confirmation.
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[#0F0F0F]/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification en cours... ({Math.round(elapsed / 1000)}s)
            </div>
            {gatewayStatus && (
              <p className="mt-2 text-xs text-[#0F0F0F]/40">
                Statut Chariow : {gatewayStatus}
              </p>
            )}
            {authUrl && (
              <div className="mt-6">
                <Button asChild className="bg-[#F2B33D] hover:bg-[#F2B33D]/90">
                  <a href={authUrl}>Continuer le paiement</a>
                </Button>
              </div>
            )}
          </>
        )}

        {status === "completed" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#10B981]/10">
              <CheckCircle2 className="h-10 w-10 text-[#10B981]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F0F0F]">Paiement confirmé</h1>
            <p className="mt-3 text-[#0F0F0F]/70">
              Redirection en cours...
            </p>
          </>
        )}

        {(status === "failed" || status === "rejected" || status === "canceled") && (
          <>
            <div
              className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
                status === "canceled" ? "bg-amber-50" : "bg-red-50"
              }`}
            >
              <XCircle
                className={`h-10 w-10 ${
                  status === "canceled" ? "text-amber-600" : "text-red-600"
                }`}
              />
            </div>
            <h1 className="text-2xl font-bold text-[#0F0F0F]">
              {status === "canceled"
                ? "Paiement abandonné"
                : status === "rejected"
                ? "Paiement rejeté"
                : "Paiement échoué"}
            </h1>
            <p className="mt-3 text-[#0F0F0F]/70">
              {failureMessage ||
                (status === "canceled"
                  ? "Vous avez quitté la page de paiement avant de le finaliser."
                  : "Le paiement n'a pas abouti. Aucun montant n'a été débité.")}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard">Retour</Link>
              </Button>
              <Button asChild className="bg-[#F2B33D] hover:bg-[#F2B33D]/90">
                <Link href={retryHref}>Réessayer</Link>
              </Button>
            </div>
          </>
        )}

        {status === "timeout" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F2B33D]/10">
              <Smartphone className="h-10 w-10 text-[#F2B33D]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F0F0F]">Paiement non confirmé</h1>
            <p className="mt-3 text-[#0F0F0F]/70">
              Nous n'avons pas reçu la confirmation à temps. Si vous avez été
              débité, votre accès sera activé automatiquement dès réception —
              rafraîchissez cette page dans quelques minutes. Sinon, réessayez.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setElapsed(0)
                  setStatus("pending")
                  setPollNonce((n) => n + 1)
                }}
              >
                Vérifier à nouveau
              </Button>
              <Button asChild className="bg-[#F2B33D] hover:bg-[#F2B33D]/90">
                <Link href={retryHref}>Réessayer</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PaymentPendingInner />
    </Suspense>
  )
}
