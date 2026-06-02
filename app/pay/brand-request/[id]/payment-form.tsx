'use client'

import { useState } from 'react'
import { Loader2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  brandRequestId: string
  amount: number
  currency: string
}

export function BrandRequestPaymentForm({ brandRequestId, amount, currency }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/payment/brand-request/${brandRequestId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok || data.error) {
        setError(data.error || "Erreur lors de l'initiation du paiement.")
        setLoading(false)
        return
      }
      if (data.checkoutUrl || data.authorizationUrl) {
        window.location.href = data.checkoutUrl || data.authorizationUrl
        return
      }
      window.location.href = `/payment/pending?ref_command=${encodeURIComponent(data.ref_command)}`
    } catch (err: any) {
      setError(err?.message || 'Erreur réseau.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-[#0F0F0F]/70">
        Vous serez redirigé vers la page de paiement sécurisée Chariow.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#F2B33D] hover:bg-[#F2B33D]/90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CreditCard className="h-4 w-4 mr-2" />
        )}
        Payer {new Intl.NumberFormat('fr-FR').format(amount)} {currency}
      </Button>
    </form>
  )
}
