import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import { promoIsLive, type PromoCampaign, type PromoOffer } from "@/lib/promo"
import { isPromoPreviewGranted } from "@/lib/promo-preview"

export const dynamic = "force-dynamic"

/**
 * GET /api/promotions/active
 * Renvoie la campagne promo en cours (dates + flags) et ses offres, ou
 * { active: false } si aucune promo n'est live.
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
      return NextResponse.json(
        { active: false, error: safeErrorMessage(error) },
        { status: 500 }
      )
    }

    // Mode preview promo (LOT K) : un admin sur l'environnement de test voit
    // bannière/popup/compte à rebours comme en période réelle, hors période.
    const preview = await isPromoPreviewGranted()
    const campaign = (campaigns ?? []).find((c) =>
      preview || promoIsLive(c as PromoCampaign, nowMs)
    ) as PromoCampaign | undefined

    if (!campaign) {
      return NextResponse.json({ active: false })
    }

    const { data: offers } = await supabase
      .from("promo_offers")
      .select("id, campaign_id, name, plan_type, price, currency, duration_months, is_active, sort_order")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    return NextResponse.json({
      active: true,
      // preview = campagne renvoyée hors période réelle grâce au mode aperçu
      // admin. Le client l'utilise pour court-circuiter les exclusions (plan
      // Pro actif, fréquence 1×/jour) afin que l'admin voie tout comme en réel.
      preview: preview && !promoIsLive(campaign, nowMs),
      campaign,
      offers: (offers ?? []) as PromoOffer[],
    })
  } catch (err) {
    return NextResponse.json(
      { active: false, error: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
