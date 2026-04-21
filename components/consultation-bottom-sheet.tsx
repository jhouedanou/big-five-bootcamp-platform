"use client"

import { useEffect, useState } from "react"
import { X, Eye, ArrowRight } from "lucide-react"
import Link from "next/link"

interface ConsultationBottomSheetProps {
  open: boolean
  onClose: () => void
  remainingConsultations: number
  totalLimit: number
}

export function ConsultationBottomSheet({
  open,
  onClose,
  remainingConsultations,
  totalLimit,
}: ConsultationBottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (open) {
      // Small delay for enter animation
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
    }
  }, [open])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 pointer-events-auto ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 pointer-events-auto transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-lg">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1 bg-white rounded-t-2xl">
            <div className="h-1 w-10 rounded-full bg-[#F5F5F5]" />
          </div>

          <div className="bg-white px-6 pb-8 pt-2 shadow-2xl">
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-[#0F0F0F]/40 hover:bg-[#F5F5F5]/50 hover:text-[#0F0F0F] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F2B33D]/10">
                <Eye className="h-6 w-6 text-[#F2B33D]" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[#0F0F0F]">
                  Plan Découverte
                </h3>
                <p className="mt-1 text-sm text-[#0F0F0F]/70">
                  {remainingConsultations > 0 ? (
                    <>
                      Il vous reste{" "}
                      <span className="font-bold text-[#F2B33D]">
                        {remainingConsultations} consultation{remainingConsultations > 1 ? "s" : ""}
                      </span>{" "}
                      gratuite{remainingConsultations > 1 ? "s" : ""} ce mois-ci.
                    </>
                  ) : (
                    <>
                      Vous avez utilisé vos{" "}
                      <span className="font-bold text-[#F2B33D]">{totalLimit} consultations</span>{" "}
                      gratuites ce mois-ci.
                    </>
                  )}
                </p>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full rounded-full bg-[#F5F5F5]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F2B33D] to-[#a855f7] transition-all duration-500"
                    style={{
                      width: `${((totalLimit - remainingConsultations) / totalLimit) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#0F0F0F]/50">
                  {totalLimit - remainingConsultations} / {totalLimit} utilisée{totalLimit - remainingConsultations > 1 ? "s" : ""}
                </p>

                {remainingConsultations <= 1 && (
                  <Link
                    href="/pricing"
                    onClick={handleClose}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F2B33D] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#F2B33D]/25 hover:bg-[#F2B33D]/90 transition-colors"
                  >
                    Passer au plan Pro
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
