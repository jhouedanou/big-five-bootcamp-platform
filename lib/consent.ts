/**
 * État de consentement RGPD, partagé entre le bandeau, les balises et le pixel.
 *
 * Une seule définition des clés de stockage : le bandeau, `lib/fb-pixel.ts` et
 * le script de Consent Mode lisaient chacun la leur, ce qui rendait toute
 * évolution risquée.
 */

export const CONSENT_STORAGE_KEY = "laveiye-rgpd-consent-v1"
export const CONSENT_COOKIE_NAME = "laveiye_rgpd_consent"
export const CONSENT_EVENT = "laveiye:rgpd-consent"
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export type ConsentPayload = {
  necessary: true
  analytics: boolean
  marketing: boolean
  acceptedAt: string
  version: 1
}

/** Choix enregistré, ou `null` si le visiteur ne s'est pas encore prononcé. */
export function readConsent(): ConsentPayload | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as Partial<ConsentPayload>
    if (typeof payload !== "object" || payload === null) return null
    return {
      necessary: true,
      analytics: payload.analytics === true,
      marketing: payload.marketing === true,
      acceptedAt: typeof payload.acceptedAt === "string" ? payload.acceptedAt : "",
      version: 1,
    }
  } catch {
    return null
  }
}

export function hasMarketingConsent(): boolean {
  return readConsent()?.marketing === true
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true
}

/**
 * Script de Consent Mode v2, à exécuter AVANT toute balise.
 *
 * Google exige que l'état par défaut soit posé avant le chargement des balises,
 * sinon une mesure part avant le choix du visiteur. Le script relit le choix
 * déjà enregistré de façon synchrone : sans cela, un visiteur qui a accepté
 * repartirait en « refusé » à chaque nouvelle page, le temps que React monte.
 *
 * `wait_for_update` laisse aux balises le temps d'attendre la mise à jour
 * quand le visiteur n'a pas encore répondu.
 */
export const CONSENT_MODE_BOOTSTRAP = `
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  try {
    var raw = window.localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)});
    if (raw) {
      var c = JSON.parse(raw);
      gtag('consent', 'update', {
        ad_storage: c.marketing ? 'granted' : 'denied',
        ad_user_data: c.marketing ? 'granted' : 'denied',
        ad_personalization: c.marketing ? 'granted' : 'denied',
        analytics_storage: c.analytics ? 'granted' : 'denied'
      });
    }
  } catch (e) {}
})();
`.trim()

/** Traduit un choix Laveiye en signaux Consent Mode. */
export function consentModeSignals(payload: Pick<ConsentPayload, "analytics" | "marketing">) {
  return {
    ad_storage: payload.marketing ? "granted" : "denied",
    ad_user_data: payload.marketing ? "granted" : "denied",
    ad_personalization: payload.marketing ? "granted" : "denied",
    analytics_storage: payload.analytics ? "granted" : "denied",
  } as const
}
