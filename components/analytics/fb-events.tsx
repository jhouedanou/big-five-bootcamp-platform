"use client"

import { useEffect, useRef } from "react"
import {
  claimNativePixel,
  fbTrack,
  hasMarketingConsent,
  releaseNativePixel,
} from "@/lib/fb-pixel"
import { CONSENT_EVENT } from "@/lib/consent"

type FbEventName = "PageView" | "ViewContent" | "Search"

/**
 * Déclenche un événement pixel Facebook au montage (LOT F), uniquement après
 * consentement RGPD marketing. Si le consentement est donné après le montage
 * (bandeau accepté sur la page), l'événement part à ce moment-là.
 */
function useFbEventOnMount(event: FbEventName, params: Record<string, unknown>) {
  const firedRef = useRef(false)
  // params stables pour l'effet (les pages passent des littéraux).
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    const fire = () => {
      if (firedRef.current) return
      if (!hasMarketingConsent()) return
      firedRef.current = true
      fbTrack(event, paramsRef.current)
    }

    fire()
    // Consentement accordé après le montage (acceptation du bandeau).
    window.addEventListener(CONSENT_EVENT, fire)
    return () => window.removeEventListener(CONSENT_EVENT, fire)
  }, [event])
}

/**
 * La route porte le pixel elle-même plutôt que de le laisser au conteneur.
 *
 * Déclaré AVANT l'effet d'événement pour que la propriété soit revendiquée
 * avant le premier `fbTrack` : les effets frères partent dans l'ordre de
 * déclaration, et l'inverse ferait partir le PageView par le conteneur.
 */
function useNativePixelOwnership(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    claimNativePixel()
    return () => releaseNativePixel()
  }, [enabled])
}

/**
 * PageView pixel — landing home et pricing (spec LOT F).
 *
 * `nativePixel` réserve le pixel à cette route : demandé par le brief
 * complémentaire pour la landing de campagne, qui doit collecter que le
 * conteneur soit configuré ou non.
 */
export function FbPageView({
  page,
  nativePixel = false,
}: {
  page: string
  nativePixel?: boolean
}) {
  useNativePixelOwnership(nativePixel)
  useFbEventOnMount("PageView", { page })
  return null
}

/** ViewContent pixel — dashboard (spec LOT F). */
export function FbViewContent({ contentName }: { contentName: string }) {
  useFbEventOnMount("ViewContent", { content_name: contentName })
  return null
}
