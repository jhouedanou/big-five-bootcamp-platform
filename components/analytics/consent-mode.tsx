"use client"

import { useEffect } from "react"

import {
  CONSENT_EVENT,
  consentModeSignals,
  type ConsentPayload,
} from "@/lib/consent"

/**
 * Relaie le choix du bandeau RGPD vers Consent Mode.
 *
 * L'état par défaut est posé dans le <head> (CONSENT_MODE_BOOTSTRAP) avant le
 * chargement des balises. Ce composant ne s'occupe que de la mise à jour, au
 * moment où le visiteur répond : sans lui, une acceptation ne débloquait rien
 * avant le rechargement de la page.
 */
export function ConsentModeBridge() {
  useEffect(() => {
    const onConsent = (event: Event) => {
      const payload = (event as CustomEvent<ConsentPayload>).detail
      if (!payload) return
      try {
        ;(window as any).gtag?.("consent", "update", consentModeSignals(payload))
      } catch {
        // La mesure ne doit jamais casser la page.
      }
    }

    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])

  return null
}
