"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { pushDataLayer } from "@/lib/datalayer"

/**
 * `page_view` sur changement de route (brief §4 et §6).
 *
 * Laveiye est une application à navigation client : sans cela, GTM ne voit que
 * le premier chargement. Une seule source de page_view — le conteneur ne doit
 * pas en produire une seconde via la mesure améliorée, sous peine de doubler
 * chaque vue.
 *
 * La première vue est ignorée quand le conteneur la produit déjà à son
 * démarrage : on ne pousse qu'à partir du deuxième pathname observé.
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
    pushDataLayer("page_view", {
      page_location: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
      page_title: document.title,
      page_path: pathname,
    })
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
