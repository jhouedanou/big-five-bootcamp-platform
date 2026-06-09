import { NextResponse } from "next/server"
import { chariowPaymentCountries } from "@/lib/payment-countries"

export const dynamic = "force-dynamic"

/**
 * GET /api/payment-countries
 * Pays supportés au checkout (dérivés de Chariow / COUNTRY_ISO), nom FR + ISO-2.
 * Liste statique (issue du code) → mise en cache CDN longue.
 */
export async function GET() {
  return NextResponse.json(
    { countries: chariowPaymentCountries(), source: "chariow" },
    { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=86400" } }
  )
}
