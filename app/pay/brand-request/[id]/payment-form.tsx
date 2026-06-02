'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FEEXPAY_PROVIDERS } from '@/lib/feexpay-providers'

interface Props {
  brandRequestId: string
  amount: number
  currency: string
}

export function BrandRequestPaymentForm({ brandRequestId, amount, currency }: Props) {
  const [phone, setPhone] = useState('')
  const [provider, setProvider] = useState('ORANGE_CIV')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 9) {
      setError('Numéro de téléphone invalide.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/payment/brand-request/${brandRequestId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleaned, provider }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok || data.error) {
        setError(data.error || 'Erreur lors de l\'initiation du paiement.')
        setLoading(false)
        return
      }
      // Wave : redirection
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
        return
      }
      // PIN flow : page d'attente
      window.location.href = `/payment/pending?ref_command=${encodeURIComponent(data.ref_command)}`
    } catch (err: any) {
      setError(err?.message || 'Erreur réseau.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="provider" className="block text-xs font-semibold text-[#0F0F0F]/70 mb-1">
          Opérateur Mobile Money
        </label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full rounded-lg border border-[#F5F5F5] bg-white px-3 py-2 text-sm outline-none focus:border-[#F2B33D]"
        >
          {FEEXPAY_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs font-semibold text-[#0F0F0F]/70 mb-1">
          Numéro de téléphone
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="22507xxxxxxxx"
          className="w-full rounded-lg border border-[#F5F5F5] bg-white px-3 py-2 text-sm outline-none focus:border-[#F2B33D]"
        />
        <p className="mt-1 text-[11px] text-[#0F0F0F]/50">
          Indicatif pays inclus, sans espace ni signe +.
        </p>
      </div>

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
        ) : null}
        Payer {new Intl.NumberFormat('fr-FR').format(amount)} {currency}
      </Button>
    </form>
  )
}
