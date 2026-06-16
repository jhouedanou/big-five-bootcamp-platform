import { NextResponse } from "next/server"
import { isPromoPreviewGranted } from "@/lib/promo-preview"

export const dynamic = "force-dynamic"

/**
 * GET /api/promotions/preview-status
 * Indique si le mode aperçu promo est actif POUR LE COMPTE COURANT
 * (flag site_settings activé ET utilisateur admin). Sert à afficher la
 * bottom sheet de rappel « Mode aperçu promo » côté client.
 */
export async function GET() {
  try {
    return NextResponse.json({ enabled: await isPromoPreviewGranted() })
  } catch {
    return NextResponse.json({ enabled: false })
  }
}
