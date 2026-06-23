import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import { promoIsLive, type PromoCampaign, type PromoOffer } from "@/lib/promo"
import { isPromoPreviewGranted } from "@/lib/promo-preview"

export const dynamic = "force-dynamic"

// Tarif Pro normal (cf. lib/pricing.ts / api/payment/subscribe PLAN_PRICES).
const PRO_NORMAL = {
  plan: "pro" as const,
  label: "Pro",
  price: 9900,
  currency: "XOF",
  duration_months: 1,
  billing: "monthly" as const,
}

/**
 * GET /api/checkout/offers
 * Offre normale (Pro) + offres promotionnelles si la promo est live.
 * Le plan Découverte n'apparaît jamais dans le checkout connecté.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const nowMs = Date.now()

    const { data: campaigns, error } = await supabase
      .from("promo_campaigns")
      .select("id, title, start_date, end_date, is_active, show_in_banner, show_in_popup")
      .eq("is_active", true)
      .order("end_date", { ascending: true })

    if (error) {
      return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
    }

    // Mode preview promo (LOT K) : un admin sur l'environnement de test voit
    // les offres comme en période réelle, hors période.
    const preview = await isPromoPreviewGranted()
    const campaign = (campaigns ?? []).find((c) =>
      preview || promoIsLive(c as PromoCampaign, nowMs)
    ) as PromoCampaign | undefined

    let promoOffers: PromoOffer[] = []
    let promoEndDate: string | null = null
    if (campaign) {
      promoEndDate = campaign.end_date
      const { data: offers } = await supabase
        .from("promo_offers")
        .select("id, campaign_id, name, plan_type, price, currency, duration_months, is_active, sort_order")
        .eq("campaign_id", campaign.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
      promoOffers = (offers ?? []) as PromoOffer[]
    }

    return NextResponse.json({
      normal: PRO_NORMAL,
      promoActive: !!campaign,
      promoEndDate,
      promoOffers,
    })
  } catch (err) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 })
  }
}
