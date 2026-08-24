"use client"

import { useEffect } from "react"

import { applyRuntimeFbPixelId } from "@/lib/fb-pixel"

/**
 * Aligne l'identifiant du pixel du navigateur sur celui de /admin/integrations.
 *
 * Les pages publiques sont rendues à la construction : l'identifiant posé dans
 * leur HTML est celui du dernier déploiement. Ce composant le relit à
 * l'exécution pour qu'un changement en admin prenne effet sans redéploiement —
 * c'est le point relevé en recette (« coller le nouveau jeton ne change rien »).
 *
 * L'appel est volontairement fait au montage, donc bien avant qu'un événement
 * ne parte : le pixel n'est chargé qu'après acceptation du bandeau RGPD, ce qui
 * laisse largement le temps à la réponse d'arriver.
 */
export function TrackingConfig() {
  useEffect(() => {
    let cancelled = false
    fetch("/api/public/tracking-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.fbPixelId) return
        applyRuntimeFbPixelId(String(data.fbPixelId))
      })
      .catch(() => {
        /* valeur de construction conservée */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
