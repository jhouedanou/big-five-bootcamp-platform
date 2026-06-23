/**
 * API Route: GET /api/admin/chariow-config
 *
 * Expose (admin uniquement) TOUS les renseignements nécessaires pour
 * configurer Chariow et son Pulse (webhook), de façon à ne plus avoir à
 * fouiller les variables d'environnement.
 *
 * Les valeurs SECRÈTES (clé API) ne sont jamais renvoyées en clair :
 * seul un statut "configuré / manquant" + 4 derniers caractères masqués.
 * Les product_id Chariow ne sont pas secrets : renvoyés en clair pour copie.
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { ADMIN_EMAILS } from '@/lib/admin-auth'
import {
  CHARIOW_BASE_URL,
  CHARIOW_PULSE_URL,
  PUBLIC_BASE_URL,
  COUNTRY_ISO,
} from '@/lib/chariow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function ensureAdmin() {
  const supabaseServer = await getSupabaseServer()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }
  const isAdmin =
    user.app_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes((user.email || '').toLowerCase())
  if (!isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 }) }
  }
  return { ok: true as const, user }
}

/** Prix attendus côté Chariow — DOIVENT correspondre exactement au plan. */
const PLAN_PRICES: Record<string, { label: string; price: number; annualPrice: number }> = {
  DISCOVERY: { label: 'Découverte', price: 1000, annualPrice: 10000 },
  BASIC: { label: 'Basic', price: 4900, annualPrice: 49000 },
  PRO: { label: 'Pro', price: 9900, annualPrice: 99000 },
}

function maskSecret(value: string | undefined): { configured: boolean; masked: string } {
  if (!value) return { configured: false, masked: '' }
  return { configured: true, masked: '••••••••••••' + value.slice(-4) }
}

export async function GET() {
  const auth = await ensureAdmin()
  if (!auth.ok) return auth.response

  // Produits Chariow attendus : CHARIOW_PRODUCT_<PLAN>_<BILLING>
  const products = (['DISCOVERY', 'BASIC', 'PRO'] as const).flatMap((plan) =>
    (['MONTHLY', 'ANNUAL'] as const).map((billing) => {
      const envKey = `CHARIOW_PRODUCT_${plan}_${billing}`
      const value = process.env[envKey] || ''
      const cfg = PLAN_PRICES[plan]
      return {
        envKey,
        plan: cfg.label,
        billing: billing === 'MONTHLY' ? 'Mensuel' : 'Annuel',
        productId: value,
        configured: Boolean(value),
        expectedPrice: billing === 'MONTHLY' ? cfg.price : cfg.annualPrice,
        currency: 'XOF',
      }
    })
  )

  // Avertissement si l'URL publique est invalide en production.
  const baseUrlWarning =
    process.env.NODE_ENV === 'production' &&
    (/localhost|127\.0\.0\.1/i.test(PUBLIC_BASE_URL) || !/^https:\/\//i.test(PUBLIC_BASE_URL))
      ? `URL publique invalide en production : "${PUBLIC_BASE_URL}". Définir NEXT_PUBLIC_APP_URL en HTTPS.`
      : null

  return NextResponse.json({
    // Webhook (Pulse) à déclarer dans Chariow → Automation → Pulses
    pulse: {
      url: CHARIOW_PULSE_URL,
      event: 'successful.sale',
    },
    // URL de retour après paiement (le ref_command réel est ajouté à l'exécution)
    redirectUrlTemplate: `${PUBLIC_BASE_URL}/payment/success?ref_command={REF_COMMAND}`,
    // Métadonnées renvoyées dans le Pulse, utilisées pour rapprocher le paiement
    customMetadataKeys: ['ref_command'],
    // API REST Chariow
    api: {
      baseUrl: CHARIOW_BASE_URL,
      key: maskSecret(process.env.CHARIOW_API_KEY),
    },
    publicBaseUrl: PUBLIC_BASE_URL,
    baseUrlWarning,
    products,
    // Mapping code pays interne → ISO 3166-1 alpha-2 (champ phone.country_code)
    countryIso: COUNTRY_ISO,
  })
}
