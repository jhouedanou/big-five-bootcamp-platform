import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/supabase-server"
import { getPublishedWebinars } from "@/lib/webinars-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

/** GET /api/webinars — programme des webinaires publiés. */
export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    const webinars = await getPublishedWebinars(user?.id ?? null)
    return NextResponse.json({ webinars })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
