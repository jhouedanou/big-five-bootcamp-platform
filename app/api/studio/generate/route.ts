import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getAuthenticatedUser } from '@/lib/supabase-server'
import { canAccessPremiumContent } from '@/lib/pricing'
import { missingFields, analyzeReference, buildGenerationPrompt } from '@/lib/ad-studio'
import { generateImage, ImageGenError } from '@/lib/image-gen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/**
 * L'enchaînement analyse + génération dépasse largement le défaut de 10 s.
 * Valeur plafonnée par le plan Vercel ; en deçà, la fonction est coupée et la
 * ligne reste en statut `error` avec un message explicite.
 */
export const maxDuration = 300

const BUCKET = 'ad-studio'
/** Générations par utilisateur et par jour — borne la dépense fournisseur. */
const DAILY_QUOTA = 10
const MAX_REFERENCE_BYTES = 8 * 1024 * 1024

/**
 * POST /api/studio/generate
 * Body: { referencePath: string, brief: { secteur, produit, ... } }
 *
 * Une seule soumission déclenche toute la chaîne : analyse de la référence puis
 * génération. Pas d'étape intermédiaire côté utilisateur, conformément au brief.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Réservé aux abonnés : chaque génération a un coût fournisseur réel.
  const { data: profile } = await admin
    .from('users')
    .select('plan, subscription_status, subscription_end_date, role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = (profile as any)?.role === 'admin'
  // Le NOM du plan, pas l'objet profil — cf. même correction dans reference/route.ts.
  if (!isAdmin && !canAccessPremiumContent((profile as any)?.plan)) {
    return NextResponse.json(
      {
        error: 'Le studio publicitaire est réservé aux abonnés.',
        code: 'premium_required',
      },
      { status: 403 }
    )
  }

  const payload = await request.json().catch(() => null)
  const brief = ((payload as any)?.brief || {}) as Record<string, string>
  const referencePath = String((payload as any)?.referencePath || '').trim()

  // Complétude vérifiée côté serveur aussi : le formulaire la contrôle déjà,
  // mais rien n'empêche d'appeler l'API directement.
  const missing = missingFields(brief)
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Brief incomplet', missing, code: 'incomplete' },
      { status: 400 }
    )
  }
  if (!referencePath) {
    return NextResponse.json(
      { error: 'Ajoutez une création de référence.', code: 'missing_reference' },
      { status: 400 }
    )
  }

  // Quota du jour, lu directement dans l'historique.
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  const { count } = await admin
    .from('ad_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since.toISOString())

  if (!isAdmin && (count ?? 0) >= DAILY_QUOTA) {
    return NextResponse.json(
      {
        error: `Vous avez atteint la limite de ${DAILY_QUOTA} générations pour aujourd'hui. Réessayez demain.`,
        code: 'quota_reached',
      },
      { status: 429 }
    )
  }

  // Ligne créée avant tout appel externe : même en cas de coupure, la tentative
  // laisse une trace consultable et décomptée.
  const { data: created, error: insertError } = await admin
    .from('ad_generations')
    .insert({
      user_id: user.id,
      reference_path: referencePath,
      context: brief,
      status: 'processing',
    })
    .select('id')
    .single()

  if (insertError || !created) {
    console.error('Création ad_generation échouée:', insertError)
    return NextResponse.json(
      { error: "Impossible de démarrer la génération. Réessayez." },
      { status: 500 }
    )
  }

  const generationId = (created as any).id

  const fail = async (logMessage: string, userMessage: string, status = 500) => {
    console.error('Studio:', logMessage)
    await admin
      .from('ad_generations')
      .update({ status: 'error', error_message: userMessage, completed_at: new Date().toISOString() })
      .eq('id', generationId)
    return NextResponse.json({ error: userMessage, generationId }, { status })
  }

  try {
    // Référence téléchargée depuis le bucket privé.
    const { data: file, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(referencePath)

    if (downloadError || !file) {
      return await fail(
        `Référence introuvable: ${downloadError?.message}`,
        "La création de référence est introuvable. Renvoyez-la et réessayez.",
        400
      )
    }
    if (file.size > MAX_REFERENCE_BYTES) {
      return await fail(
        `Référence trop lourde: ${file.size}`,
        "La création de référence dépasse 8 Mo. Compressez-la et réessayez.",
        400
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const reference = {
      base64: buffer.toString('base64'),
      mimeType: file.type || 'image/png',
    }

    // Agent 1 → agent 2, enchaînés sans intervention.
    const analysis = await analyzeReference(reference)
    const prompt = buildGenerationPrompt(brief, analysis)
    const image = await generateImage({ prompt, reference, format: brief.format })

    const ext = image.mimeType.includes('jpeg') ? 'jpg' : 'png'
    const resultPath = `${user.id}/${generationId}.${ext}`

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(resultPath, image.buffer, { contentType: image.mimeType, upsert: true })

    if (uploadError) {
      return await fail(
        `Upload résultat échoué: ${uploadError.message}`,
        "L'image a été produite mais n'a pas pu être enregistrée. Réessayez."
      )
    }

    await admin
      .from('ad_generations')
      .update({
        status: 'done',
        analysis_text: analysis?.analysis || null,
        framework_text: analysis?.framework || null,
        result_path: resultPath,
        provider: image.provider,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId)

    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(resultPath, 60 * 60)

    return NextResponse.json({
      generationId,
      status: 'done',
      imageUrl: signed?.signedUrl || null,
      analysis: analysis?.analysis || null,
      framework: analysis?.framework || null,
      remaining: Math.max(0, DAILY_QUOTA - (count ?? 0) - 1),
    })
  } catch (error: any) {
    if (error instanceof ImageGenError) {
      // Le statut vient de l'erreur : un quota fournisseur est un 429, pas un
      // 500 — le navigateur et les logs racontent alors la vraie histoire.
      return await fail(error.message, error.userMessage, error.status)
    }
    return await fail(
      `Erreur inattendue: ${error?.message || error}`,
      "Un problème est survenu pendant la génération. Réessayez."
    )
  }
}
