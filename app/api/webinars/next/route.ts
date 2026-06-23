import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/supabase-server"
import { getNextWebinar } from "@/lib/webinars-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

/** GET /api/webinars/next — prochaine session publiée à venir. */
export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    const webinar = await getNextWebinar(user?.id ?? null)
    return NextResponse.json({ webinar })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
