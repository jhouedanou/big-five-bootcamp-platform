/**
 * Rate-limiter in-memory simple (fenêtre glissante).
 *
 * Suffisant pour un MVP single-instance. Pour une prod multi-instance,
 * remplacer le Map par Redis / Upstash. Les seuils sont volontairement bas
 * pour bloquer les bots brute-force (codes promo, login attempts).
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Purge expired buckets every minute to avoid unbounded memory growth.
// Guard via globalThis to avoid duplicate timers on HMR / module re-imports.
const PURGE_KEY = '__laveiyeRateLimitPurger__'
if (typeof globalThis !== 'undefined' && !(globalThis as any)[PURGE_KEY]) {
  ;(globalThis as any)[PURGE_KEY] = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k)
    }
  }, 60_000)
  // Unref so timer doesn't keep Node process alive (no-op on Workers).
  const t: any = (globalThis as any)[PURGE_KEY]
  if (t && typeof t.unref === 'function') t.unref()
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * @param key   identifiant logique (ex. `promo:${ip}:${email}`)
 * @param max   nombre maximum de hits autorisés dans la fenêtre
 * @param windowMs durée de la fenêtre en ms (défaut: 60_000 = 1 min)
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: max - 1, resetAt }
  }

  existing.count += 1
  if (existing.count > max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }
  return { allowed: true, remaining: max - existing.count, resetAt: existing.resetAt }
}

/**
 * Extrait l'IP client depuis les headers Vercel/Next.
 */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') || ''
  return fwd.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}
