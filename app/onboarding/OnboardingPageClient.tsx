"use client"

import { useRouter } from "next/navigation"
import { OnboardingForm } from "@/components/onboarding/OnboardingForm"

export function OnboardingPageClient({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <OnboardingForm
          source="onboarding"
          onCompleted={() => {
            router.replace(nextPath)
            router.refresh()
          }}
        />
      </div>
    </div>
  )
}
