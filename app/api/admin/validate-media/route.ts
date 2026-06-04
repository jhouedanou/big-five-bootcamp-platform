import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { validateMediaUrl, inChunks } from "@/lib/media-validate-server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const urls: string[] = Array.isArray(body?.urls)
    ? body.urls
    : typeof body?.url === "string"
      ? [body.url]
      : []

  if (urls.length === 0) {
    return NextResponse.json({ error: "Aucune URL fournie" }, { status: 400 })
  }
  if (urls.length > 100) {
    return NextResponse.json({ error: "Maximum 100 URLs par requête" }, { status: 400 })
  }

  const results = await inChunks(urls, 5, validateMediaUrl)
  return NextResponse.json({ results })
}
