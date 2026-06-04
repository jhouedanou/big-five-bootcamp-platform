import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Configuration de la campagne LAVEIYE, pilotée depuis l'admin (table
 * `site_settings`) — AUCUNE variable d'env Vercel requise, aucun redéploiement.
 *
 * Clés stockées dans `site_settings` :
 *   - campaign_enabled            : "true" / "false" — interrupteur maître
 *   - campaign_start_date         : ISO date — ouverture des inscriptions publiques (lundi)
 *   - campaign_end_date           : ISO date — fin de la gratuité automatique
 *   - campaign_free_days          : durée Basic offerte par compte (défaut 90)
 *   - campaign_existing_activated_at : timestamp idempotence (one-shot comptes existants)
 */

export const CAMPAIGN_KEYS = {
  enabled: 'campaign_enabled',
  startDate: 'campaign_start_date',
  endDate: 'campaign_end_date',
  freeDays: 'campaign_free_days',
  existingActivatedAt: 'campaign_existing_activated_at',
} as const

export const CAMPAIGN_DEFAULT_FREE_DAYS = 90

export interface CampaignSettings {
  enabled: boolean
  startDate: string | null
  endDate: string | null
  freeDays: number
  existingActivatedAt: string | null
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return false
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value.trim().toLowerCase())
}

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY requis pour lire la config campagne')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Lit la config campagne depuis `site_settings`. Accepte un client Supabase
 * (service role) optionnel pour réutiliser une connexion existante.
 */
export async function getCampaignSettings(
  supabase?: SupabaseClient
): Promise<CampaignSettings> {
  const db = supabase ?? adminClient()
  const keys = Object.values(CAMPAIGN_KEYS)

  const { data } = await db
    .from('site_settings')
    .select('key, value')
    .in('key', keys)

  const map: Record<string, string> = {}
  for (const row of (data as Array<{ key: string; value: string }> | null) ?? []) {
    map[row.key] = row.value
  }

  const freeDaysRaw = parseInt(map[CAMPAIGN_KEYS.freeDays] ?? '', 10)
  const freeDays = Number.isFinite(freeDaysRaw) && freeDaysRaw > 0
    ? Math.min(730, freeDaysRaw)
    : CAMPAIGN_DEFAULT_FREE_DAYS

  return {
    enabled: parseBool(map[CAMPAIGN_KEYS.enabled]),
    startDate: map[CAMPAIGN_KEYS.startDate] || null,
    endDate: map[CAMPAIGN_KEYS.endDate] || null,
    freeDays,
    existingActivatedAt: map[CAMPAIGN_KEYS.existingActivatedAt] || null,
  }
}

// Détecte une date au format seul "YYYY-MM-DD" (sans composante horaire).
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * La campagne est-elle ouverte au public à l'instant `now` ?
 * Vrai si : activée ET (pas de date de début OU début passé) ET (pas de fin OU fin future).
 *
 * Pour une `endDate` au format jour seul ("YYYY-MM-DD"), la campagne reste
 * ouverte jusqu'à la fin de cette journée (23:59:59.999) — cohérent avec
 * l'aperçu admin qui traite la date de fin comme inclusive. Sans ce traitement,
 * `new Date("YYYY-MM-DD")` est interprété à minuit UTC et fermerait la campagne
 * un jour trop tôt.
 */
export function isCampaignPublicActive(
  settings: CampaignSettings,
  now: Date = new Date()
): boolean {
  if (!settings.enabled) return false
  if (settings.startDate) {
    const start = new Date(settings.startDate)
    if (!Number.isNaN(start.getTime()) && now < start) return false
  }
  if (settings.endDate) {
    const endRaw = DATE_ONLY_RE.test(settings.endDate.trim())
      ? `${settings.endDate.trim()}T23:59:59.999Z`
      : settings.endDate
    const end = new Date(endRaw)
    if (!Number.isNaN(end.getTime()) && now > end) return false
  }
  return true
}

export interface ActivateExistingResult {
  activated: number
  skipped: number
  errors: number
  total: number
}

/**
 * Bascule tous les comptes existants (non-admin) en Basic gratuit pour `days`
 * jours. Conserve les comptes Pro actifs non-expirés. Écrit une ligne d'audit
 * `payments` par compte. Logique pure : pas de `next/cache` (réutilisable par
 * le cron ET par la server action admin).
 */
export async function activateExistingUsersBasic(
  supabase: SupabaseClient,
  days: number,
  source: 'bulk_admin' | 'cron_auto' = 'bulk_admin'
): Promise<ActivateExistingResult> {
  const safeDays = Math.max(1, Math.min(730, Math.floor(days || CAMPAIGN_DEFAULT_FREE_DAYS)))
  const now = new Date()
  const endDate = new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000)

  const { data: targets, error: fetchErr } = await supabase
    .from('users')
    .select('id, email, plan, subscription_status, subscription_end_date')
    .not('role', 'eq', 'admin')

  if (fetchErr) throw fetchErr
  if (!targets || targets.length === 0) {
    return { activated: 0, skipped: 0, errors: 0, total: 0 }
  }

  const toActivate = (targets as Array<any>).filter((u) => {
    const plan = String(u.plan || '').toLowerCase()
    const status = String(u.subscription_status || '')
    // Garder Pro actif non-expiré tel quel
    if (plan === 'pro' && status === 'active') {
      const endAt = u.subscription_end_date ? new Date(u.subscription_end_date) : null
      if (!endAt || endAt > now) return false
    }
    return true
  })

  const CHUNK = 100
  let activated = 0
  let errors = 0

  for (let i = 0; i < toActivate.length; i += CHUNK) {
    const chunk = toActivate.slice(i, i + CHUNK)
    const ids = chunk.map((u) => u.id)

    const { error: updateErr } = await supabase
      .from('users')
      .update({
        plan: 'Basic',
        subscription_status: 'active',
        subscription_start_date: now.toISOString(),
        subscription_end_date: endDate.toISOString(),
        updated_at: now.toISOString(),
      })
      .in('id', ids)

    if (updateErr) {
      console.error('[campaign] activateExistingUsersBasic chunk error:', updateErr)
      errors += chunk.length
      continue
    }

    const auditRows = chunk.map((u) => ({
      ref_command: `campaign-laveiye-${u.id}-${now.getTime()}`,
      amount: 0,
      currency: 'XOF',
      status: 'completed',
      payment_method: 'campaign_free',
      user_email: u.email || null,
      item_name: `Campagne LAVEIYE — Basic gratuit ${safeDays}j`,
      metadata: {
        type: 'campaign_laveiye_free',
        campaign: 'laveiye_2026',
        days: safeDays,
        source,
        previous_plan: u.plan,
      },
      created_at: now.toISOString(),
      completed_at: now.toISOString(),
    }))

    await supabase.from('payments').insert(auditRows)
    activated += chunk.length
  }

  // Marqueur d'idempotence : empêche le cron de relancer le one-shot.
  await supabase
    .from('site_settings')
    .upsert(
      { key: CAMPAIGN_KEYS.existingActivatedAt, value: now.toISOString(), updated_at: now.toISOString() },
      { onConflict: 'key' }
    )

  return {
    activated,
    skipped: targets.length - toActivate.length,
    errors,
    total: targets.length,
  }
}
