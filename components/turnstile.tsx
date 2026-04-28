"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact" | "flexible"
          action?: string
        }
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId?: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"

interface TurnstileProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  theme?: "light" | "dark" | "auto"
  size?: "normal" | "compact" | "flexible"
  action?: string
  className?: string
}

export function Turnstile({
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "flexible",
  action,
  className,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) return
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        "error-callback": onError,
        "expired-callback": onExpire,
        theme,
        size,
        action,
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      window.onTurnstileLoad = renderWidget
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`
      )
      if (!existing) {
        const script = document.createElement("script")
        script.src = SCRIPT_SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey, onVerify, onError, onExpire, theme, size, action])

  if (!siteKey) {
    return (
      <div className="text-xs text-destructive">
        NEXT_PUBLIC_TURNSTILE_SITE_KEY manquant
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}
