import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getAuthenticatedUser } from '@/lib/supabase-server'
import { canAccessPremiumContent } from '@/lib/pricing'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { safeErrorMessage } from '@/lib/api-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'ad-studio'
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']

/**
 * Crée le bucket s'il manque. La migration 15 le déclare, mais l'insert direct
 * dans storage.buckets ne passe pas sur toutes les instances Supabase — le
 * bucket était absent en production alors que la table existait, d'où les
 * échecs d'upload. L'API Storage est la voie fiable ; même pattern que
 * /api/upload/video.
 */
async function ensureBucketExists(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { data: buckets } = await admin.storage.listBuckets()
  if (buckets?.some((b) => b.name === BUCKET)) return

  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED,
  })
  if (error && !error.message.includes('already exists')) throw error
}

/**
 * POST /api/studio/reference
 * Multipart: file
 *
 * Téléverse la création de référence dans le bucket PRIVÉ `ad-studio` et
 * retourne son chemin. Contrairement au PDF des études, le fichier transite ici
 * par la fonction : 8 Mo passent sous la limite Vercel, et cela permet de
 * valider le type réel avant écriture.
 *
 * Le bucket reste privé : ce sont des créations clientes, elles ne doivent pas
 * être accessibles par URL devinable.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const limited = rateLimit(`studio-ref:${user.id}:${getClientIp(request)}`, 20, 10 * 60_000)
  if (!limited.allowed) {
    return NextResponse.json({ error: 'Trop de téléversements. Patientez un instant.' }, { status: 429 })
  }

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('users')
    .select('plan, subscription_status, subscription_end_date, role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = (profile as any)?.role === 'admin'
  // canAccessPremiumContent attend le NOM du plan, pas l'objet profil — lui
  // passer l'objet faisait planter (plan || '').toLowerCase() en 500 pour tout
  // utilisateur non-admin en base. Le repro n'était pas passé par cette branche.
  if (!isAdmin && !canAccessPremiumContent((profile as any)?.plan)) {
    return NextResponse.json(
      { error: 'Le studio publicitaire est réservé aux abonnés.', code: 'premium_required' },
      { status: 403 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: `Format non supporté : ${file.type || 'inconnu'}. Utilisez PNG, JPEG ou WebP.` },
        { status: 400 }
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Image trop lourde (max ${Math.round(MAX_BYTES / (1024 * 1024))} Mo).` },
        { status: 400 }
      )
    }

    await ensureBucketExists(admin)

    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
    // Chemin préfixé par l'utilisateur : la référence d'un abonné n'est jamais
    // mélangée à celle d'un autre.
    const path = `${user.id}/ref-${Date.now()}.${ext}`

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Upload référence studio échoué:', error.message)
      return NextResponse.json({ error: "L'envoi de l'image a échoué. Réessayez." }, { status: 500 })
    }

    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60)

    return NextResponse.json({ path, previewUrl: signed?.signedUrl || null })
  } catch (error: any) {
    // Pile complète côté serveur + cause résumée dans la réponse : un 500 nu
    // est indiagnosticable depuis le navigateur.
    console.error('Erreur POST référence studio:', error?.stack || error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}
