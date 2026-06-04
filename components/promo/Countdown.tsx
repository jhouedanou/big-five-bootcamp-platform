"use client"

import { useEffect, useState } from "react"
import { computeCountdown, formatCountdown } from "@/lib/promo"
import { cn } from "@/lib/utils"

interface CountdownProps {
  endIso: string
  prefix?: string
  className?: string
  /** appelé une fois quand le décompte atteint zéro */
  onExpire?: () => void
}

/**
 * Compte à rebours "XXj XXh XXmin", mis à jour automatiquement.
 */
export function Countdown({ endIso, prefix, className, onExpire }: CountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const c = computeCountdown(endIso, now)

  useEffect(() => {
    if (c.expired) onExpire?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.expired])

  if (c.expired) return null

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix ? `${prefix} ` : ""}
      <strong>{formatCountdown(c)}</strong>
    </span>
  )
}
