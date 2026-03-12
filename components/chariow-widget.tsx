"use client"

import { useEffect, useRef } from "react"

interface ChariowWidgetProps {
  /** ID du produit Chariow (ex: prd_t5xjq2) */
  productId?: string
  /** Domaine du store Chariow */
  storeDomain?: string
  /** Locale du widget */
  locale?: string
  /** Couleur principale du widget */
  primaryColor?: string
  /** Couleur de fond du widget */
  backgroundColor?: string
  /** Style du widget */
  widgetStyle?: "tap" | "inline"
  /** Style des bords */
  borderStyle?: "rounded" | "square"
  /** Largeur du CTA */
  ctaWidth?: "xs" | "sm" | "md" | "lg" | "full"
  /** Animation du CTA */
  ctaAnimation?: "shine" | "none"
  /** Classe CSS additionnelle */
  className?: string
}

/**
 * Composant Chariow Widget
 * 
 * Intègre le widget de paiement Chariow directement sur la page.
 * Le widget gère tout le flow de checkout (Mobile Money, CB, etc.)
 * 
 * Après le paiement, Chariow envoie un webhook qui active l'abonnement.
 */
export function ChariowWidget({
  productId = "prd_t5xjq2",
  storeDomain = "creative.bigfive.solutions",
  locale = "fr",
  primaryColor = "#80378d",
  backgroundColor = "#FFFFFF",
  widgetStyle = "tap",
  borderStyle = "rounded",
  ctaWidth = "full",
  ctaAnimation = "shine",
  className,
}: ChariowWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    if (scriptLoadedRef.current) return
    scriptLoadedRef.current = true

    // Charger le CSS du widget
    if (!document.querySelector('link[href*="js.chariow.com/v1/widget.min.css"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://js.chariow.com/v1/widget.min.css"
      document.head.appendChild(link)
    }

    // Charger le script du widget
    if (!document.querySelector('script[src*="js.chariow.com/v1/widget.min.js"]')) {
      const script = document.createElement("script")
      script.src = "https://js.chariow.com/v1/widget.min.js"
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  return (
    <div className={className}>
      <div
        ref={containerRef}
        id="chariow-widget"
        data-product-id={productId}
        data-store-domain={storeDomain}
        data-style={widgetStyle}
        data-border-style={borderStyle}
        data-cta-width={ctaWidth}
        data-background-color={backgroundColor}
        data-cta-animation={ctaAnimation}
        data-locale={locale}
        data-primary-color={primaryColor}
      />
    </div>
  )
}
