"use client"

import { useEffect, useRef } from "react"
import { fbTrack, hasMarketingConsent } from "@/lib/fb-pixel"

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
    window.addEventListener("laveiye:rgpd-consent", fire)
    return () => window.removeEventListener("laveiye:rgpd-consent", fire)
  }, [event])
}

/** PageView pixel — landing home et pricing (spec LOT F). */
export function FbPageView({ page }: { page: string }) {
  useFbEventOnMount("PageView", { page })
  return null
}

/** ViewContent pixel — dashboard (spec LOT F). */
export function FbViewContent({ contentName }: { contentName: string }) {
  useFbEventOnMount("ViewContent", { content_name: contentName })
  return null
}
