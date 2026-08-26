import { NextRequest, NextResponse } from 'next/server'

import { checkAdmin } from '@/lib/admin-auth'
import { devisObjectPath, devisReadPath, isBrandRequestId } from '@/lib/brand-request-devis'
import { DOCUMENTS_BUCKET } from '@/lib/storage-buckets'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Durée de vie du lien signé. Court : il ne sert qu'à la redirection qui suit
 * immédiatement, pas à être conservé ni partagé.
 */
const SIGNED_URL_TTL_SECONDS = 5 * 60

/**
 * Objet absent ≠ stockage en panne : le premier mérite un 404 parlant, le second
 * ne doit pas être maquillé en « pas de devis ».
 */
function isNotFound(error: unknown): boolean {
  const status = Number((error as any)?.statusCode ?? (error as any)?.status)
  if (status === 404) return true
  return /not\s*found/i.test(String((error as any)?.message || ''))
}

/**
 * GET /api/brand-requests/[id]/devis
 *
 * Sert le devis PDF depuis le bucket PRIVÉ `documents`. Le fichier n'a pas
 * d'URL publique : on vérifie l'appelant, puis on redirige vers une URL signée
 * de quelques minutes. Même schéma que /api/etudes/download.
 *
 * C'est ce lien — stable, sans jeton — qui est stocké dans `devis_url` et rendu
 * par l'admin, le tableau de bord et l'e-mail « Votre devis est prêt ». Y stocker
 * une URL signée serait impossible : elle aurait expiré avant que le client
 * n'ouvre son e-mail.
 *
 * Autorisé : un admin, ou le propriétaire de la demande. Un visiteur sans
 * session est renvoyé vers /login puis ramené ici — le lien voyage par e-mail,
 * où le destinataire n'est pas forcément connecté.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!isBrandRequestId(id)) {
    return NextResponse.json({ error: 'Identifiant de demande invalide' }, { status: 400 })
  }

  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', devisReadPath(id))
      return NextResponse.redirect(loginUrl)
    }

    const admin = getSupabaseAdmin()
    const { data: brandRequest, error } = await admin
      .from('brand_requests')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()

    // Erreur de requête ≠ demande inconnue : ne pas annoncer un 404 alors que
    // c'est la base qui est en cause.
    if (error) {
      console.error('[brand-requests/devis] lecture échouée :', error.message)
      return NextResponse.json(
        { error: 'Service momentanément indisponible. Réessayez dans un instant.' },
        { status: 503 },
      )
    }
    if (!brandRequest) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    const isOwner =
      !!(brandRequest as any).user_id && (brandRequest as any).user_id === user.id
    if (!isOwner && !(await checkAdmin())) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // L'existence de l'objet fait foi, pas `devis_url` : l'admin doit pouvoir
    // relire le PDF qu'il vient d'envoyer avant même d'enregistrer la demande.
    // Les deux restent en phase — retirer ou refuser un devis supprime l'objet.
    const { data: signed, error: signError } = await admin.storage
      .from(DOCUMENTS_BUCKET.name)
      .createSignedUrl(devisObjectPath(id), SIGNED_URL_TTL_SECONDS)

    if (signError || !signed?.signedUrl) {
      if (isNotFound(signError)) {
        return NextResponse.json(
          { error: 'Aucun devis n’est disponible pour cette demande.' },
          { status: 404 },
        )
      }
      console.error('[brand-requests/devis] signature échouée :', signError)
      return NextResponse.json(
        { error: 'Devis momentanément indisponible.' },
        { status: 500 },
      )
    }

    return NextResponse.redirect(signed.signedUrl)
  } catch (err) {
    console.error('[brand-requests/devis] erreur :', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
