"use client"

import { useEffect, useRef } from "react"

import { trackEvent } from "@/lib/analytics"

/**
 * `view_pricing` (brief §6) — affichage de la page ou du bloc tarifs.
 *
 * Monté sur `/pricing` et `/subscribe`, qui sont deux entrées distinctes du
 * même funnel : `source_context` permet de les distinguer dans GA4 sans créer
 * deux événements.
 */
export function ViewPricing({ source }: { source: string }) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    // Persisté : c'est la première marche du funnel payant, et /admin/tracking
    // doit pouvoir la compter sans dépendre de GA4.
    trackEvent("view_pricing", { source }, true)
  }, [source])

  return null
}
