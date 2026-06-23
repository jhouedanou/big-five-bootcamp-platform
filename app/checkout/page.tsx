import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/supabase-server"
import { CheckoutClient } from "./CheckoutClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Checkout | Laveiye",
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  const user = await getAuthenticatedUser()
  if (!user) {
    redirect("/login?redirect=/checkout")
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-400">Chargement…</div>}>
      <CheckoutClient />
    </Suspense>
  )
}
