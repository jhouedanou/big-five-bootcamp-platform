"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { isGtmActive, pushDataLayer } from "@/lib/datalayer"

/**
 * Type de page du brief (§6), déduit de la route.
 *
 * GA4 ne peut pas l'inventer : sans ce paramètre, la dimension reste vide et
 * les rapports ne distinguent pas une page d'atterrissage publicitaire d'une
 * page applicative.
 */
function pageType(pathname: string): string {
  if (pathname === "/") return "home"
  if (pathname.startsWith("/etudes")) return "study_landing"
  if (pathname.startsWith("/pricing") || pathname.startsWith("/subscribe")) return "pricing"
  if (pathname.startsWith("/content")) return "campaign"
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/library")) return "app"
  if (pathname.startsWith("/checkout") || pathname.startsWith("/payment") || pathname.startsWith("/pay"))
    return "checkout"
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding")
  )
    return "auth"
  if (pathname.startsWith("/admin")) return "admin"
  return "other"
}

/**
 * `page_view` sur changement de route (brief §4 et §6).
 *
 * Laveiye est une application à navigation client : sans cela, GTM ne voit que
 * le premier chargement. Une seule source de page_view — le conteneur ne doit
 * pas en produire une seconde via la mesure améliorée, sous peine de doubler
 * chaque vue.
 *
 * La première vue est ignorée quand le conteneur la produit déjà à son
 * démarrage : on ne pousse qu'à partir du deuxième pathname observé. Hors
 * conteneur, c'est `gtag('config')` qui la produit — la règle vaut dans les
 * deux cas.
 */
function RouteTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firstRef = useRef(true)

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      return
    }
    if (!pathname) return

    const query = searchParams?.toString()
    const params = {
      page_location: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
      page_title: document.title,
      page_path: pathname,
      page_type: pageType(pathname),
    }

    pushDataLayer("page_view", params)

    // Sans conteneur, ce push ne suffit pas : `gtag.js` ignore les objets
    // simples, qui sont une convention GTM. La navigation interne ne
    // produisait donc AUCUNE vue dans GA4 tant que la bascule n'était pas
    // faite. On parle alors directement à gtag — et jamais en plus du
    // conteneur, sous peine de doubler la vue (brief §11).
    if (!isGtmActive() && typeof window.gtag === "function") {
      window.gtag("event", "page_view", params)
    }
  }, [pathname, searchParams])

  return null
}

export function DataLayerRouteTracker() {
  // `useSearchParams` impose une frontière Suspense pour ne pas basculer toute
  // l'application en rendu dynamique.
  return (
    <Suspense fallback={null}>
      <RouteTracker />
    </Suspense>
  )
}
