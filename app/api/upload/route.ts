import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  ensureBucket,
  MEDIA_BUCKET,
  IMAGE_ALLOWED_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_LABEL,
} from '@/lib/storage-buckets'
import { normalizeImageBuffer } from '@/lib/image-server'
import {
  MAX_PRESET_WIDTH,
  normalizedSuffix,
  normalizedSuffixOf,
} from '@/lib/image-presets'

export const dynamic = 'force-dynamic';

const BUCKET_NAME = MEDIA_BUCKET.name

// Vérifier que l'utilisateur est authentifié
async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}


/**
 * POST /api/upload
 * Upload une image vers Supabase Storage
 * Body: multipart/form-data avec champ "file"
 * Returns: { url: string } — URL publique de l'image
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Lire le fichier depuis le FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Vérifier le type MIME (liste partagée avec la config du bucket)
    const allowedTypes = IMAGE_ALLOWED_TYPES
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Type de fichier non supporté : ${file.type}. Types acceptés : JPG, PNG, WebP, AVIF, GIF.`
      }, { status: 400 })
    }

    // Vérifier la taille — même valeur que la limite du bucket, pour qu'un
    // fichier accepté ici ne soit jamais rejeté ensuite par le stockage.
    if (file.size > IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Le fichier est trop volumineux (maximum ${IMAGE_MAX_LABEL}).` },
        { status: 400 },
      )
    }

    // Créer le client admin pour l'upload
    const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const adminKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!adminUrl || !adminKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }
    const supabaseAdmin = createClient(adminUrl, adminKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // S'assurer que le bucket existe et que sa config correspond au code
    await ensureBucket(supabaseAdmin, MEDIA_BUCKET)

    // Largeur voulue par l'appelant. Le repli est la PLUS GRANDE largeur du
    // catalogue, jamais 580 : sinon ce filet re-descendrait à 580 une image de
    // galerie que le client vient de normaliser à 1200.
    const requestedWidth = Number(formData.get('maxWidth'))
    const maxWidth =
      Number.isFinite(requestedWidth) && requestedWidth > 0
        ? Math.min(requestedWidth, MAX_PRESET_WIDTH)
        : MAX_PRESET_WIDTH

    const arrayBuffer = await file.arrayBuffer()

    // Filet de sécurité : n'opère qu'en local et sur Vercel. Sur Cloudflare
    // Workers `sharp` est absent, la fonction rend les octets tels quels et le
    // cron rattrape. La normalisation qui compte en production est celle du
    // navigateur (lib/image-client.ts).
    const norm = await normalizeImageBuffer(new Uint8Array(arrayBuffer), maxWidth)

    // Générer un nom de fichier unique.
    //
    // Le suffixe de normalisation doit SURVIVRE au renommage. L'ancienne version
    // reconstruisait `${timestamp}-${alea}.${ext}` à partir de la seule
    // extension : le `-580.webp` posé par le navigateur était perdu, et le cron
    // resélectionnait chaque nuit un fichier déjà normalisé — son budget de 25
    // par passage partait en pure perte pendant que les vrais fichiers
    // surdimensionnés n'avaient jamais leur tour.
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fallbackExt =
      norm.ext !== 'bin' ? norm.ext : file.name.split('.').pop() || 'jpg'
    const tail = norm.normalized
      ? normalizedSuffix(maxWidth)
      : normalizedSuffixOf(file.name) ?? `.${fallbackExt}`
    const fileName = `${timestamp}-${randomSuffix}${tail}`
    const filePath = `thumbnails/${fileName}`

    // Upload vers Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, norm.buf, {
        contentType: norm.normalized ? norm.contentType : file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ error: `Erreur d'upload: ${error.message}` }, { status: 500 })
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return NextResponse.json({ 
      url: publicUrl,
      path: data.path,
      fileName: fileName,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
