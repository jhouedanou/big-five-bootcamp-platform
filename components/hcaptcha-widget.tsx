"use client"

import React, { useRef, useCallback, useImperativeHandle, forwardRef } from "react"
import HCaptcha from "@hcaptcha/react-hcaptcha"

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "2c12554a-d4f0-4e38-980a-af5620a0a41a"

export interface HCaptchaWidgetRef {
  /** Exécuter le captcha (invisible ou challenge) */
  execute: () => void
  /** Réinitialiser le captcha */
  resetCaptcha: () => void
}

interface HCaptchaWidgetProps {
  /** Callback quand le captcha est résolu — reçoit le token */
  onVerify: (token: string) => void
  /** Callback quand le token expire */
  onExpire?: () => void
  /** Callback en cas d'erreur */
  onError?: (error: string) => void
  /** Taille du widget : normal, compact ou invisible */
  size?: "normal" | "compact" | "invisible"
  /** Thème clair ou sombre */
  theme?: "light" | "dark"
  /** Classe CSS du conteneur */
  className?: string
}

const HCaptchaWidget = forwardRef<HCaptchaWidgetRef, HCaptchaWidgetProps>(
  ({ onVerify, onExpire, onError, size = "normal", theme = "light", className }, ref) => {
    const captchaRef = useRef<HCaptcha>(null)

    useImperativeHandle(ref, () => ({
      execute: () => {
        captchaRef.current?.execute()
      },
      resetCaptcha: () => {
        captchaRef.current?.resetCaptcha()
      },
    }))

    const handleVerify = useCallback(
      (token: string) => {
        onVerify(token)
      },
      [onVerify]
    )

    const handleExpire = useCallback(() => {
      onExpire?.()
    }, [onExpire])

    const handleError = useCallback(
      (err: string) => {
        console.error("hCaptcha error:", err)
        onError?.(err)
      },
      [onError]
    )

    return (
      <div className={className}>
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          size={size}
          theme={theme}
          onVerify={handleVerify}
          onExpire={handleExpire}
          onError={handleError}
        />
      </div>
    )
  }
)

HCaptchaWidget.displayName = "HCaptchaWidget"

export { HCaptchaWidget, HCAPTCHA_SITE_KEY }
