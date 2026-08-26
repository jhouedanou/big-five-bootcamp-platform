import { NextResponse } from "next/server"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * Consentement aux communications marketing du compte connecté.
 *
 * Le brief §6 attend `contact_opt_in_updated` « enregistré côté serveur », et le
 * §9 « un opt-in traçable » avant tout envoi WhatsApp. C'est cette route qui
 * rend le choix révocable depuis le site : sans elle, le consentement recueilli
 * à l'inscription ne pouvait plus être retiré, et l'événement ne portait jamais
 * `status: denied`.
 */
export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("marketing_opt_in")
    .eq("id", user.id)
    .maybeSingle()

  // `null` se distingue de `false` : jamais répondu n'est pas un refus.
  return NextResponse.json({ optIn: (data as any)?.marketing_opt_in ?? null })
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.optIn !== "boolean") {
    return NextResponse.json({ error: "Choix manquant." }, { status: 400 })
  }

  const { error } = await getSupabaseAdmin()
    .from("users")
    .update({
      marketing_opt_in: body.optIn,
      // Horodaté dans les deux sens : c'est la preuve du recueil comme celle
      // du retrait.
      marketing_opt_in_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    console.error("Mise à jour du consentement marketing échouée:", error.message)
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 })
  }

  return NextResponse.json({ success: true, optIn: body.optIn })
}
