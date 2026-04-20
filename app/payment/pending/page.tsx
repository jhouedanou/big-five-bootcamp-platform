"use client"

/**
 * Page: /payment/pending?ref_command=...
 *
 * Affichée après qu'un dépôt PawaPay ait été initié (flow PIN).
 * Le client saisit son code PIN sur son téléphone — on polle l'API jusqu'à
 * recevoir un statut final (COMPLETED / FAILED / REJECTED).
 */

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, Smartphone, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const MAX_POLL_MS = 5 * 60 * 1000 // 5 minutes
const POLL_INTERVAL_MS = 4000

type Status = "pending" | "completed" | "failed" | "rejected" | "duplicate"

function PaymentPendingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCommand = searchParams.get("ref_command") || ""

  const [status, setStatus] = useState<Status>("pending")
  const [pawapayStatus, setPawapayStatus] = useState<string | undefined>()
  const [failureMessage, setFailureMessage] = useState<string | undefined>()
  const [authUrl, setAuthUrl] = useState<string | undefined>()
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (!refCommand) return
    let cancelled = false

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
        if (data?.payment?.pawapay_status) setPawapayStatus(data.payment.pawapay_status)
        if (data?.payment?.authorizationUrl) setAuthUrl(data.payment.authorizationUrl)
        if (data?.payment?.failureReason?.failureMessage) {
          setFailureMessage(data.payment.failureReason.failureMessage)
        }

        if (s === "completed") {
          setTimeout(() => router.push(`/payment/success?ref_command=${encodeURIComponent(refCommand)}`), 1200)
          return
        }
        if (s === "failed" || s === "rejected") {
          return
        }
      } catch (err) {
        console.error("Polling error", err)
      }

      if (Date.now() - startedAt.current < MAX_POLL_MS && !cancelled) {
        setElapsed(Date.now() - startedAt.current)
        setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [refCommand, router])

  if (!refCommand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center">
          <p className="text-[#1A1F2B]/70">Référence de paiement manquante.</p>
          <Link href="/dashboard" className="text-[#80368D] underline mt-4 inline-block">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#D0E4F2]">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#80368D]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[#1A1F2B]">Laveiye</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        {status === "pending" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#80368D]/10">
              <Smartphone className="h-10 w-10 text-[#80368D]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1F2B]">
              Confirmez sur votre téléphone
            </h1>
            <p className="mt-3 text-[#1A1F2B]/70">
              Un message vous a été envoyé sur votre mobile. Saisissez votre
              code PIN Mobile Money pour valider le paiement.
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[#1A1F2B]/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification en cours... ({Math.round(elapsed / 1000)}s)
            </div>
            {pawapayStatus && (
              <p className="mt-2 text-xs text-[#1A1F2B]/40">
                Statut PawaPay : {pawapayStatus}
              </p>
            )}
            {authUrl && (
              <div className="mt-6">
                <Button asChild className="bg-[#80368D] hover:bg-[#80368D]/90">
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
            <h1 className="text-2xl font-bold text-[#1A1F2B]">Paiement confirmé</h1>
            <p className="mt-3 text-[#1A1F2B]/70">
              Redirection en cours...
            </p>
          </>
        )}

        {(status === "failed" || status === "rejected") && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1F2B]">
              Paiement {status === "rejected" ? "rejeté" : "échoué"}
            </h1>
            {failureMessage && (
              <p className="mt-3 text-[#1A1F2B]/70">{failureMessage}</p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard">Retour</Link>
              </Button>
              <Button asChild className="bg-[#80368D] hover:bg-[#80368D]/90">
                <Link href="/subscribe">Réessayer</Link>
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
