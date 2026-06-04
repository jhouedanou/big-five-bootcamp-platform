/**
 * POST /api/checkout/create-payment
 *
 * Crée un paiement Chariow pour :
 *  - l'offre normale Pro (selection = "pro_normal"), ou
 *  - une offre promotionnelle (selection = <promo_offer.id>).
 *
 * Réutilise le MÊME contrat `payments.metadata` que /api/payment/subscribe :
 * l'activation est finalisée par le webhook existant
 * (/api/payment/chariow/pulse → activateUserSubscription). On n'active JAMAIS
 * l'abonnement depuis le retour front.
 */

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase-server"
import {
  initCheckout,
  generateRefCommand,
  getProductId,
  COUNTRY_ISO,
  CHARIOW_CONFIG,
} from "@/lib/chariow"
import { addDays, computeSubscriptionEnd } from "@/lib/subscription"
import { promoIsLive, type PromoCampaign } from "@/lib/promo"
import { safeErrorMessage } from "@/lib/api-errors"
import { sendGA4ServerEvent } from "@/lib/ga4-mp"

const PRO_NORMAL = { price: 9900, dbKey: "Pro", label: "Pro", plan: "pro" }

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://laveiye.com" : "http://localhost:3000")
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await getSupabaseServer()
    const {
      data: { user: authUser },
    } = await supabaseServer.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { selection, source, country, phone } = body as {
      selection?: string
      source?: string
      country?: string
      phone?: string
    }
    if (!selection) {
      return NextResponse.json({ error: "Sélection manquante" }, { status: 400 })
    }

    // Pays + téléphone requis pour préremplir Chariow → Moneroo.
    const countryKey = String(country || "").toUpperCase().trim()
    const countryIso = COUNTRY_ISO[countryKey]
    const phoneDigits = String(phone || "").replace(/\D/g, "")
    if (!countryIso) {
      return NextResponse.json({ error: "Pays invalide ou non supporté." }, { status: 400 })
    }
    if (phoneDigits.length < 8) {
      return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // --- Résolution de l'offre choisie ---
    let planSlug: string
    let planDbKey: string
    let planLabel: string
    let amount: number
    let durationDays: number
    let productId: string | undefined
    let promoOfferId: string | null = null
    let itemName: string

    if (selection === "pro_normal") {
      planSlug = PRO_NORMAL.plan
      planDbKey = PRO_NORMAL.dbKey
      planLabel = PRO_NORMAL.label
      amount = PRO_NORMAL.price
      durationDays = 30
      productId = getProductId("pro", "monthly")
      itemName = "Abonnement Laveiye Pro - 1 mois"
    } else {
      // Offre promo : valider que la campagne est bien live.
      const { data: offer } = await supabase
        .from("promo_offers")
        .select("id, name, plan_type, price, duration_months, is_active, payment_product_id, campaign_id")
        .eq("id", selection)
        .eq("is_active", true)
        .maybeSingle()

      if (!offer) {
        return NextResponse.json({ error: "Offre introuvable." }, { status: 404 })
      }

      const { data: campaign } = await supabase
        .from("promo_campaigns")
        .select("id, title, start_date, end_date, is_active, show_in_banner, show_in_popup")
        .eq("id", offer.campaign_id)
        .maybeSingle()

      if (!promoIsLive(campaign as PromoCampaign | null, Date.now())) {
        return NextResponse.json(
          { error: "Cette offre promotionnelle a expiré." },
          { status: 410 }
        )
      }

      planSlug = String(offer.plan_type).toLowerCase()
      planDbKey = planSlug === "pro" ? "Pro" : "Basic"
      planLabel = planSlug === "pro" ? "Pro" : "Basic"
      amount = offer.price
      durationDays = offer.duration_months * 30
      productId = offer.payment_product_id || undefined
      promoOfferId = offer.id
      itemName = `${offer.name} — ${offer.duration_months} mois ${planLabel}`

      if (!productId) {
        // Garde-fou : le produit Chariow dédié (prix promo) doit être renseigné.
        return NextResponse.json(
          { error: "Offre promo non configurée (product_id Chariow manquant)." },
          { status: 503 }
        )
      }
    }

    if (!CHARIOW_CONFIG.API_KEY || !productId) {
      return NextResponse.json(
        { error: "Chariow non configuré (API_KEY/PRODUCT_ID manquants)." },
        { status: 500 }
      )
    }

    // --- Utilisateur + date de base (prolongation si déjà actif) ---
    const { data: dbUser } = await supabase
      .from("users")
      .select("id, email, name, subscription_status, subscription_end_date")
      .eq("id", authUser.id)
      .maybeSingle()

    const userEmail = authUser.email!
    const customerName = (dbUser as any)?.name || userEmail.split("@")[0]
    const now = new Date()
    const currentEnd = (dbUser as any)?.subscription_end_date
      ? new Date((dbUser as any).subscription_end_date)
      : null
    const isActive =
      (dbUser as any)?.subscription_status === "active" && currentEnd && currentEnd > now
    const baseDate = isActive ? currentEnd! : now
    const subscriptionEndDate =
      selection === "pro_normal"
        ? computeSubscriptionEnd(baseDate, { billing: "monthly" })
        : addDays(baseDate, durationDays)

    const ref_command = generateRefCommand(selection === "pro_normal" ? "SUB" : "PROMO")

    const paymentInsert = {
      user_email: userEmail,
      amount,
      final_amount: amount,
      currency: "XOF",
      status: "pending",
      payment_method: "chariow",
      client_phone: phoneDigits,
      ref_command,
      metadata: {
        type: "subscription",
        plan: planSlug,
        plan_label: planLabel,
        plan_db_key: planDbKey,
        billing: "monthly",
        renewal: isActive,
        duration_days: durationDays,
        subscription_end_date: subscriptionEndDate.toISOString(),
        previous_end_date: isActive ? currentEnd!.toISOString() : null,
        item_name: itemName,
        customer_name: customerName,
        userId: authUser.id,
        gateway: "chariow",
        promo_offer_id: promoOfferId,
        source: source || null,
      },
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert(paymentInsert as any)
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json(
        { error: "Création du paiement impossible", details: safeErrorMessage(paymentError) },
        { status: 500 }
      )
    }

    // Log critique (Supabase) : offre choisie + tentative de paiement.
    await supabase.from("analytics_events").insert([
      {
        user_id: authUser.id,
        event_name: "promo_offer_selected",
        source: "checkout",
        metadata: { selection, source, plan: planSlug, amount, promo_offer_id: promoOfferId },
      },
      {
        user_id: authUser.id,
        event_name: "payment_attempted",
        source: "checkout",
        metadata: { ref_command, plan: planSlug, amount },
      },
    ])

    // Relais GA4 (Measurement Protocol) — événements critiques côté serveur.
    void sendGA4ServerEvent("payment_attempted", {
      source: "checkout",
      plan: planSlug,
      amount,
      promo_offer_id: promoOfferId ?? undefined,
      user_id: authUser.id,
    })

    // --- Init checkout Chariow ---
    const baseUrl = resolveBaseUrl()
    const nameParts = String(customerName).trim().split(/\s+/)
    const firstName = nameParts[0] || "Client"
    const lastName = nameParts.slice(1).join(" ") || firstName

    try {
      const result = await initCheckout({
        productId,
        email: userEmail,
        firstName,
        lastName,
        phone: { number: phoneDigits, country_code: countryIso },
        redirectUrl: `${baseUrl}/payment/success?ref_command=${encodeURIComponent(ref_command)}`,
        customMetadata: { ref_command },
        paymentCurrency: "XOF",
      })
      if (!result.checkoutUrl) throw new Error(`Chariow checkout sans URL (step=${result.step})`)

      if (result.saleId) {
        await supabase
          .from("payments")
          .update({
            provider_transaction_id: result.saleId,
            metadata: { ...(payment as any).metadata, chariow_sale_id: result.saleId },
          })
          .eq("id", (payment as any).id)
      }

      return NextResponse.json({
        success: true,
        ref_command,
        checkoutUrl: result.checkoutUrl,
        amount,
        plan: planSlug,
        duration_days: durationDays,
      })
    } catch (e: any) {
      await supabase.from("payments").update({ status: "failed" }).eq("id", (payment as any).id)
      await supabase.from("analytics_events").insert({
        user_id: authUser.id,
        event_name: "payment_failed",
        source: "checkout",
        metadata: { ref_command, reason: safeErrorMessage(e) },
      })
      return NextResponse.json(
        { error: "Impossible d'initialiser le paiement Chariow", details: safeErrorMessage(e) },
        { status: 500 }
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
