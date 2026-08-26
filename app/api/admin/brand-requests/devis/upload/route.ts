import { NextRequest, NextResponse } from 'next/server'

import { checkAdmin } from '@/lib/admin-auth'
import { safeErrorMessage } from '@/lib/api-errors'
import {
  devisObjectPath,
  devisReadPath,
  isBrandRequestId,
} from '@/lib/brand-request-devis'
import {
  DOCUMENT_ALLOWED_TYPES,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_LABEL,
  DOCUMENTS_BUCKET,
  ensureBucket,
} from '@/lib/storage-buckets'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/brand-requests/devis/upload
 *
 * Prépare l'envoi du devis PDF d'une demande de marque.
 *
 * L'admin postait auparavant le fichier à /api/upload, qui ne valide que des
 * types image et dépose dans `shoo`, bucket PUBLIC : la route répondait 400 sur
 * `application/pdf` et la fonctionnalité n'a jamais rien produit (aucune ligne
 * `brand_requests` n'a de `devis_url`). Deux raisons de ne pas se contenter
 * d'élargir la liste MIME :
 *
 *  1. un devis porte un nom de client et un montant négocié — il n'a rien à
 *     faire dans un bucket public, dont les URL sont permanentes et servies par
 *     un CDN ;
 *  2. le fichier transiterait par la fonction serverless, dont Vercel plafonne
 *     le corps à ~4,5 Mo alors que l'interface en autorise 10.
 *
 * On renvoie donc une URL d'upload signée sur le bucket privé `documents` et le
 * navigateur écrit directement dans Supabase Storage, comme /api/upload/video
 * et /api/admin/studies/upload.
 *
 * Body: { id, contentType, size }
 * Retour: { uploadUrl, token, path, bucket, devisUrl }
 * Le client envoie ensuite le fichier en PUT sur `uploadUrl`, puis enregistre
 * `devisUrl` dans la demande via PATCH /api/admin/brand-requests.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const id = String(body?.id || '').trim()
    const contentType = String(body?.contentType || '')
    const size = Number(body?.size || 0)

    if (!isBrandRequestId(id)) {
      return NextResponse.json({ error: 'Identifiant de demande invalide' }, { status: 400 })
    }
    if (!DOCUMENT_ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error: `Format non supporté : ${contentType || 'inconnu'}. Seul le PDF est accepté.`,
        },
        { status: 400 },
      )
    }
    // Même plafond que le bucket : un fichier accepté ici ne doit jamais être
    // refusé ensuite par le stockage.
    if (!size || size > DOCUMENT_MAX_BYTES) {
      return NextResponse.json(
        { error: `Le fichier dépasse ${DOCUMENT_MAX_LABEL}.` },
        { status: 400 },
      )
    }

    const admin = getSupabaseAdmin()

    // La demande doit exister : sans ce contrôle, une faute de frappe sème dans
    // le bucket un objet que plus personne n'ira jamais lire ni supprimer.
    const { data: brandRequest, error: lookupError } = await admin
      .from('brand_requests')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (lookupError) {
      console.error('[brand-requests/devis/upload] lecture échouée :', lookupError.message)
      return NextResponse.json(
        { error: 'Service momentanément indisponible. Réessayez dans un instant.' },
        { status: 503 },
      )
    }
    if (!brandRequest) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    await ensureBucket(admin, DOCUMENTS_BUCKET)

    const path = devisObjectPath(id)
    const { data, error } = await admin.storage
      .from(DOCUMENTS_BUCKET.name)
      // upsert : « Remplacer » écrase le devis précédent au même chemin. Sans
      // ça, le second envoi échouerait sur un doublon.
      .createSignedUploadUrl(path, { upsert: true })

    if (error || !data) {
      console.error('[brand-requests/devis/upload] signature échouée :', error)
      return NextResponse.json(
        { error: "Impossible de préparer l'upload", details: safeErrorMessage(error) },
        { status: 500 },
      )
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      bucket: DOCUMENTS_BUCKET.name,
      devisUrl: devisReadPath(id),
    })
  } catch (err) {
    console.error('[brand-requests/devis/upload] erreur :', err)
    return NextResponse.json(
      { error: 'Erreur serveur', details: safeErrorMessage(err) },
      { status: 500 },
    )
  }
}
