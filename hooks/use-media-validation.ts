"use client"

import { useCallback, useState } from "react"
import {
  preValidateMediaUrl,
  type MediaValidationResult,
} from "@/lib/media-validation"

/**
 * Hook de validation média pour le bulk editor.
 *
 * - `validate(url)`   : valide une URL (pré-check synchrone instantané, puis
 *   sonde serveur si nécessaire — public ? embeddable ? + re-héberge les
 *   images Drive). Retourne le résultat enrichi.
 * - `validateMany(urls)` : version batch (1 appel réseau).
 *
 * La sonde réseau passe par POST /api/admin/validate-media (admin only).
 */
export function useMediaValidation() {
  const [isValidating, setIsValidating] = useState(false)

  const callServer = useCallback(async (urls: string[]): Promise<MediaValidationResult[]> => {
    const res = await fetch("/api/admin/validate-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || `Validation échouée (${res.status})`)
    }
    const data = await res.json()
    return (data.results || []) as MediaValidationResult[]
  }, [])

  const validate = useCallback(
    async (url: string): Promise<MediaValidationResult> => {
      // Court-circuit synchrone (URL inconnue, lien Google éphémère, embed
      // structurellement impossible) → pas d'appel réseau.
      const pre = preValidateMediaUrl(url)
      if (pre) return pre

      setIsValidating(true)
      try {
        const [result] = await callServer([url])
        return result
      } finally {
        setIsValidating(false)
      }
    },
    [callServer],
  )

  const validateMany = useCallback(
    async (urls: string[]): Promise<MediaValidationResult[]> => {
      const out: MediaValidationResult[] = new Array(urls.length)
      const toProbe: { url: string; index: number }[] = []

      urls.forEach((url, i) => {
        const pre = preValidateMediaUrl(url)
        if (pre) out[i] = pre
        else toProbe.push({ url, index: i })
      })

      if (toProbe.length > 0) {
        setIsValidating(true)
        try {
          const probed = await callServer(toProbe.map((t) => t.url))
          probed.forEach((r, j) => {
            out[toProbe[j].index] = r
          })
        } finally {
          setIsValidating(false)
        }
      }
      return out
    },
    [callServer],
  )

  return { validate, validateMany, isValidating }
}
