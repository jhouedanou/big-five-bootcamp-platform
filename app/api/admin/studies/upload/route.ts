import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { safeErrorMessage } from '@/lib/api-errors'
import {
  ensureBucket,
  STUDIES_BUCKET,
  STUDY_ALLOWED_TYPES,
  STUDY_MAX_BYTES,
  STUDY_MAX_LABEL,
} from '@/lib/storage-buckets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Upload du PDF d'une étude.
 *
 * Le fichier ne transite PAS par la fonction serverless : Vercel plafonne le
 * corps de requête à ~4,5 Mo, ce qu'une étude dépasse largement. On renvoie
 * une URL d'upload signée et le navigateur écrit directement dans Supabase
 * Storage — même approche que /api/upload/video.
 *
 * Le bucket `studies` est PRIVÉ : aucune URL publique n'est renvoyée ici. Le
 * téléchargement passe toujours par /api/etudes/download, qui vérifie le jeton
 * du lead avant de signer un lien temporaire.
 */

const BUCKET_NAME = STUDIES_BUCKET.name

/**
 * POST /api/admin/studies/upload
 * Body: { slug, fileName, contentType, size }
 * Retour: { uploadUrl, token, path } — le client uploade via
 * supabase.storage.from('studies').uploadToSignedUrl(path, token, file),
 * puis enregistre `path` dans studies.file_path.
 */
export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => null)
    const slug = String(body?.slug || 'etude')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
    const fileName = String(body?.fileName || '')
    const contentType = String(body?.contentType || '')
    const size = Number(body?.size || 0)

    if (!STUDY_ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Format non supporté : ${contentType || 'inconnu'}. Seul le PDF est accepté.` },
        { status: 400 }
      )
    }
    if (!size || size > STUDY_MAX_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${STUDY_MAX_LABEL}).` },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    await ensureBucket(admin, STUDIES_BUCKET)

    // Nom horodaté : remplacer une étude ne casse pas les liens déjà envoyés,
    // puisque chaque lead reçoit une URL signée régénérée à la demande.
    const safeName =
      fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60) || 'etude'
    const path = `${slug}/${Date.now()}-${safeName}.pdf`

    const { data, error } = await admin.storage.from(BUCKET_NAME).createSignedUploadUrl(path)
    if (error || !data) {
      return NextResponse.json(
        { error: "Impossible de préparer l'upload", details: safeErrorMessage(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      bucket: BUCKET_NAME,
    })
  } catch (error) {
    console.error('Erreur préparation upload étude:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}
