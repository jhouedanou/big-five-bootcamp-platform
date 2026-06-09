"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Check, Sparkles, ChevronsUpDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Countdown } from "@/components/promo/Countdown"
import { trackEvent, trackGA4 } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import type { PromoOffer } from "@/lib/promo"

interface PaymentCountry {
  code: string
  name: string
}

/** Drapeau emoji depuis un code ISO-2 (indicateurs régionaux Unicode). */
function flagEmoji(code: string): string {
  const cc = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return ""
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)))
}

interface NormalOffer {
  plan: string
  label: string
  price: number
  currency: string
  duration_months: number
}

interface OffersResponse {
  normal: NormalOffer
  promoActive: boolean
  promoEndDate: string | null
  promoOffers: PromoOffer[]
}

const PRO_NORMAL_ID = "pro_normal"

function fmtPrice(n: number) {
  return `${n.toLocaleString("fr-FR")} FCFA`
}

export function CheckoutClient() {
  const searchParams = useSearchParams()
  const source = searchParams.get("source") || undefined

  const [data, setData] = useState<OffersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [selection, setSelection] = useState<string | null>(null)
  const [country, setCountry] = useState("") // code ISO-2
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [countries, setCountries] = useState<PaymentCountry[]>([])

  // Pays supportés par Moneroo (dédupliqués côté serveur), avec repli statique.
  useEffect(() => {
    let alive = true
    fetch("/api/payment-countries", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { countries?: PaymentCountry[] }) => {
        if (alive && Array.isArray(d.countries)) setCountries(d.countries)
      })
      .catch(() => {
        /* repli silencieux : la liste reste vide, le combobox affiche un message */
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetch("/api/checkout/offers", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d: OffersResponse) => {
        if (alive) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  function selectOption(id: string, meta: Record<string, any>) {
    setSelection(id)
    trackGA4("checkout_option_selected", { selection: id, ...meta })
  }

  const selected = useMemo(() => {
    if (!data || !selection) return null
    if (selection === PRO_NORMAL_ID) {
      return {
        title: "Offre normale",
        plan: "Pro",
        durationMonths: data.normal.duration_months,
        price: data.normal.price,
      }
    }
    const o = data.promoOffers.find((x) => x.id === selection)
    if (!o) return null
    return {
      title: o.name,
      plan: o.plan_type === "pro" ? "Pro" : "Basic",
      durationMonths: o.duration_months,
      price: o.price,
    }
  }, [data, selection])

  async function pay() {
    if (!selection) {
      toast.error("Sélectionnez une offre.")
      return
    }
    if (!country) {
      toast.error("Sélectionnez votre pays.")
      return
    }
    if (phone.replace(/\D/g, "").length < 8) {
      toast.error("Numéro de téléphone invalide.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/checkout/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection, source, country, phone }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.checkoutUrl) {
        toast.error(json?.error ?? "Impossible de démarrer le paiement.")
        return
      }
      trackEvent("promo_offer_selected", { selection, source }, true)
      window.location.href = json.checkoutUrl
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Impossible de charger les offres. Réessayez plus tard.
        </div>
      </div>
    )
  }

  const showPromo = data.promoActive && data.promoOffers.length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">Choisissez votre offre</h1>
        <p className="text-sm text-neutral-500">
          Sélectionnez une offre pour continuer vers le paiement.
        </p>
      </header>

      {/* Offre normale */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Offre normale</h2>
          <p className="text-sm text-neutral-500">
            Passez au plan Pro pour accéder à toutes les fonctionnalités avancées de Laveiye.
          </p>
        </div>
        <OfferCard
          selected={selection === PRO_NORMAL_ID}
          onSelect={() => selectOption(PRO_NORMAL_ID, { plan: "pro", kind: "normal" })}
          title="Plan Pro"
          price={fmtPrice(data.normal.price)}
          subtitle="Tarif normal · 1 mois"
          cta="Passer au Pro"
        />
      </section>

      {/* Offres promotionnelles */}
      {showPromo && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Offres promotionnelles</h2>
              <p className="text-sm text-neutral-500">
                Profitez d'une offre spéciale pour prolonger votre accès à Laveiye.
              </p>
            </div>
            {data.promoEndDate && (
              <Countdown
                endIso={data.promoEndDate}
                prefix="Fin de l'offre dans :"
                className="text-xs text-[#F2B33D]"
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.promoOffers.map((o) => (
              <OfferCard
                key={o.id}
                selected={selection === o.id}
                onSelect={() => selectOption(o.id, { plan: o.plan_type, kind: "promo" })}
                title={`${o.duration_months} mois ${o.plan_type === "pro" ? "Pro" : "Basic"}`}
                price={fmtPrice(o.price)}
                subtitle={
                  o.plan_type === "pro"
                    ? "Accédez au plan Pro pendant 2 mois avec les fonctionnalités avancées."
                    : "3 mois d'accès au plan Basic pour continuer à utiliser Laveiye à tarif réduit."
                }
                cta={o.plan_type === "pro" ? "Choisir Pro" : "Choisir Basic"}
                badge="Offre limitée"
              />
            ))}
          </div>
        </section>
      )}

      {/* Coordonnées paiement */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-900">Pays</label>
          <CountryCombobox countries={countries} value={country} onChange={setCountry} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-900">Téléphone (Mobile Money)</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07 00 00 00 00"
            inputMode="tel"
          />
        </div>
      </section>

      {/* Récapitulatif */}
      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Récapitulatif</h3>
        {selected ? (
          <div className="space-y-1 text-sm">
            <Row label="Votre choix" value={selected.title} />
            <Row label="Plan" value={selected.plan} />
            <Row label="Durée" value={`${selected.durationMonths} mois`} />
            <Row label="Prix" value={fmtPrice(selected.price)} />
            <div className="mt-2 border-t border-neutral-200 pt-2">
              <Row label="Total à payer" value={fmtPrice(selected.price)} bold />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Sélectionnez une offre ci-dessus.</p>
        )}

        <Button
          onClick={pay}
          disabled={!selection || submitting}
          className="mt-4 w-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Redirection…
            </>
          ) : (
            "Continuer vers le paiement"
          )}
        </Button>
      </section>
    </div>
  )
}

function CountryCombobox({
  countries,
  value,
  onChange,
}: {
  countries: PaymentCountry[]
  value: string
  onChange: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => countries.find((c) => c.code === value) || null,
    [countries, value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return countries
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    )
  }, [countries, query])

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setTimeout(() => inputRef.current?.focus(), 0)
        else setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/40"
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span aria-hidden>{flagEmoji(selected.code)}</span>
              {selected.name}
            </span>
          ) : (
            <span className="text-neutral-400">Sélectionnez votre pays</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-neutral-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-3">
          <Search className="size-4 text-neutral-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un pays…"
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {countries.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-400">
              Chargement des pays…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-400">
              Aucun pays trouvé.
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code)
                  setOpen(false)
                  setQuery("")
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-neutral-100",
                  c.code === value && "bg-neutral-50 font-medium"
                )}
              >
                <span aria-hidden>{flagEmoji(c.code)}</span>
                <span className="flex-1">{c.name}</span>
                {c.code === value && <Check className="size-4 text-[#F2B33D]" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={cn("text-neutral-900", bold && "text-base font-bold")}>{value}</span>
    </div>
  )
}

function OfferCard({
  selected,
  onSelect,
  title,
  price,
  subtitle,
  cta,
  badge,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  price: string
  subtitle: string
  cta: string
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative w-full rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-[#F2B33D] ring-2 ring-[#F2B33D]/40"
          : "border-neutral-200 hover:border-neutral-400"
      )}
    >
      {badge && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#F2B33D] px-2 py-0.5 text-[10px] font-semibold text-black">
          <Sparkles className="size-3" /> {badge}
        </span>
      )}
      <div className="mb-1 flex items-center gap-2">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full border",
            selected ? "border-[#F2B33D] bg-[#F2B33D] text-black" : "border-neutral-300"
          )}
        >
          {selected && <Check className="size-3.5" />}
        </span>
        <span className="font-semibold text-neutral-900">{title}</span>
      </div>
      <p className="text-xl font-bold text-neutral-900">{price}</p>
      <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
      <span className="mt-3 inline-block text-sm font-medium text-[#F2B33D]">{cta} →</span>
    </button>
  )
}
