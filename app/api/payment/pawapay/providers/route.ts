import { NextResponse } from 'next/server'
import { getActiveConfig } from '@/lib/pawapay'
import {
  PAWAPAY_COUNTRIES,
  PAWAPAY_PROVIDERS,
  type PawaPayCountryCode,
  type PawaPayProvider,
} from '@/lib/pawapay-providers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CACHE_TTL_MS = 60 * 60 * 1000 // 1h — providers bougent rarement

let cache: {
  payload: { providers: PawaPayProvider[]; source: 'api' | 'fallback'; updatedAt: string }
  expiresAt: number
} | null = null

const PROVIDER_LABEL_PREFIX: Record<string, string> = {
  MTN_MOMO: 'MTN Mobile Money',
  ORANGE: 'Orange Money',
  MOOV: 'Moov Money',
  FREE: 'Free Money',
  WAVE: 'Wave',
  AIRTEL: 'Airtel Money',
  VODACOM_MPESA: 'M-Pesa',
  MPESA: 'M-Pesa',
  TIGO: 'Tigo Pesa',
  ZAMTEL: 'Zamtel Kwacha',
}

function isPawaPayCountryCode(code: string): code is PawaPayCountryCode {
  return code in PAWAPAY_COUNTRIES
}

/** Génère un label lisible depuis un code provider comme `MTN_MOMO_CIV`. */
function buildLabel(value: string, country: PawaPayCountryCode): string {
  const parts = value.split('_')
  const countrySuffix = parts.pop()
  const providerKey = parts.join('_')
  const providerName = PROVIDER_LABEL_PREFIX[providerKey] ?? providerKey
  const countryName = PAWAPAY_COUNTRIES[country]?.name ?? countrySuffix ?? ''
  return `${providerName} — ${countryName}`
}

interface NormalizedEntry {
  value: string
  country: PawaPayCountryCode
  currency: 'XOF' | 'XAF'
}

/**
 * Le format de `/v2/active-conf` a évolué entre versions de l'API.
 * On accepte les variantes connues — flat array (v1 style) ou
 * `{ countries: [{ country, providers: [...] }] }` (v2 style).
 */
function normalizeActiveConf(raw: unknown): NormalizedEntry[] {
  const out: NormalizedEntry[] = []
  const seen = new Set<string>()

  const push = (value: string | undefined, country: string | undefined, currency: string | undefined, depositActive: boolean) => {
    if (!value || !country || !currency || !depositActive) return
    if (!isPawaPayCountryCode(country)) return
    if (currency !== 'XOF' && currency !== 'XAF') return
    if (seen.has(value)) return
    seen.add(value)
    out.push({ value, country, currency })
  }

  // Variante A : array plat (ActiveConfEntry-style)
  if (Array.isArray(raw)) {
    for (const e of raw as any[]) {
      const operations = e?.correspondentDescription?.paymentOperations as
        | Array<{ operationType?: string; isActive?: boolean }>
        | undefined
      const depositActive = operations
        ? operations.some((op) => op?.operationType === 'DEPOSIT' && op?.isActive)
        : true // si pas d'info, on considère actif (l'API ne renverrait pas l'entry sinon)
      push(e?.correspondent, e?.country, e?.currency, depositActive)
    }
    return out
  }

  // Variante B : { countries: [...] } v2-style
  const countries = (raw as any)?.countries
  if (Array.isArray(countries)) {
    for (const c of countries) {
      const country = c?.country
      const providers = Array.isArray(c?.providers) ? c.providers : []
      for (const p of providers) {
        const value = p?.provider
        const currencies = Array.isArray(p?.currencies) ? p.currencies : []
        for (const cur of currencies) {
          const op = cur?.operationTypes?.DEPOSIT
          const depositActive = op
            ? op?.status === 'ENABLED' || op?.isActive === true
            : true
          push(value, country, cur?.currency, depositActive)
        }
      }
    }
    return out
  }

  // Variante C : { correspondents: [...] } (forme wrappée existante)
  const correspondents = (raw as any)?.correspondents
  if (Array.isArray(correspondents)) {
    return normalizeActiveConf(correspondents)
  }

  return out
}

function staticFallback(): PawaPayProvider[] {
  return PAWAPAY_PROVIDERS
}

export async function GET() {
  const now = Date.now()
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(cache.payload, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
    })
  }

  try {
    const raw = await getActiveConfig({ operationType: 'DEPOSIT' })
    const entries = normalizeActiveConf(raw)
    if (entries.length === 0) {
      throw new Error('active-conf renvoyé vide ou format inconnu')
    }
    const providers: PawaPayProvider[] = entries.map((e) => ({
      value: e.value,
      country: e.country,
      currency: e.currency,
      label: buildLabel(e.value, e.country),
    }))

    const payload = {
      providers,
      source: 'api' as const,
      updatedAt: new Date().toISOString(),
    }
    cache = { payload, expiresAt: now + CACHE_TTL_MS }
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
    })
  } catch (err: any) {
    console.warn('[pawapay/providers] fallback statique:', err?.message || err)
    const payload = {
      providers: staticFallback(),
      source: 'fallback' as const,
      updatedAt: new Date().toISOString(),
    }
    // Cache court sur fallback pour retenter rapidement
    cache = { payload, expiresAt: now + 60 * 1000 }
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' },
    })
  }
}
