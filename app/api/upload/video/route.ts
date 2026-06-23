import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

/**
 * Upload vidéo admin (LOT H).
 *
 * Diagnostic de l'échec d'origine :
 *  1. /api/upload n'acceptait que images + PDF (MIME vidéo rejeté) ;
 *  2. surtout, faire transiter le fichier par la fonction serverless est
 *     impossible pour une vidéo : Vercel limite le corps de requête à
 *     ~4,5 Mo (et le timeout de fonction s'ajoute pour les gros fichiers).
 *
 * Solution : URL d'upload signée Supabase Storage. Le client envoie le
 * fichier DIRECTEMENT vers Supabase (aucune limite Vercel), la fonction ne
 * fait que générer l'URL signée et renvoyer l'URL publique finale.
 */

const BUCKET_NAME = "videos"
const VIDEO_MAX_BYTES = 200 * 1024 * 1024 // 200 Mo
const VIDEO_ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
]

async function ensureBucketExists(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET_NAME)
  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: VIDEO_MAX_BYTES,
      allowedMimeTypes: VIDEO_ALLOWED_TYPES,
    })
    if (error && !error.message.includes("already exists")) {
      throw error
    }
  }
}

/**
 * POST /api/upload/video
 * Body JSON: { fileName, contentType, size }
 * Returns: { uploadUrl, token, path, publicUrl }
 * Le client uploade ensuite via supabase.storage.uploadToSignedUrl (ou PUT).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const fileName = String(body?.fileName || "")
    const contentType = String(body?.contentType || "")
    const size = Number(body?.size || 0)

    if (!VIDEO_ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error: `Format non supporté : ${contentType || "inconnu"}. Formats acceptés : MP4, WebM, MOV.`,
        },
        { status: 400 }
      )
    }
    if (!size || size > VIDEO_MAX_BYTES) {
      return NextResponse.json(
        { error: `Vidéo trop volumineuse (max ${Math.round(VIDEO_MAX_BYTES / (1024 * 1024))} Mo).` },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    await ensureBucketExists(supabaseAdmin)

    const ext = (fileName.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4"
    const path = `campaigns/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path)

    if (error || !data) {
      return NextResponse.json(
        { error: "Impossible de préparer l'upload", details: safeErrorMessage(error) },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      bucket: BUCKET_NAME,
      publicUrl,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
