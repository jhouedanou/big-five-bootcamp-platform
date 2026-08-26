import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { DownloadRelay } from './download-relay'

/**
 * Relais de mesure du téléchargement d'une étude.
 *
 * Le lien du mail pointait droit sur `/api/etudes/download`, qui répond par une
 * redirection vers l'URL signée. Une redirection serveur ne peut rien pousser
 * dans le `dataLayer` : le téléchargement — pourtant P0 au brief §6 — n'était
 * mesuré nulle part. Cette page intercale un passage par le navigateur, émet
 * l'événement, puis laisse l'API faire son travail inchangé.
 *
 * Le nom du segment est statique : il l'emporte donc sur `/etudes/[slug]`.
 * AUCUNE étude ne doit porter le slug « telechargement ».
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Téléchargement de votre étude',
  // Lien personnel porteur d'un jeton : il n'a rien à faire dans un index.
  robots: { index: false, follow: false },
}

/**
 * Résout le jeton en slug d'étude, SANS compter le téléchargement.
 *
 * Le comptage reste dans `/api/etudes/download` : lui seul sait si le fichier a
 * réellement été servi, et le dédoublement du compteur serait pire que son
 * absence.
 *
 * Les trois issues sont distinguées à dessein. Un jeton inconnu ne doit pas
 * produire de `guide_download` — il n'y aura pas de fichier. Une base
 * injoignable, en revanche, n'est pas un lien invalide : on relaie quand même
 * et on laisse l'API trancher, quitte à perdre la mesure de ce passage.
 */
type Resolution =
  | { status: 'ok'; slug: string }
  | { status: 'unknown' }
  | { status: 'error' }

async function resolveGuide(token: string): Promise<Resolution> {
  try {
    const admin = getSupabaseAdmin()

    const { data: lead, error: leadError } = await admin
      .from('study_leads')
      .select('study_id')
      .eq('download_token', token)
      .maybeSingle()

    if (leadError) return { status: 'error' }
    if (!lead) return { status: 'unknown' }

    const { data: study } = await admin
      .from('studies')
      .select('slug')
      .eq('id', (lead as any).study_id)
      .maybeSingle()

    const slug = (study as any)?.slug as string | undefined
    return slug ? { status: 'ok', slug } : { status: 'error' }
  } catch (error) {
    console.error('Résolution du jeton de téléchargement échouée:', error)
    return { status: 'error' }
  }
}

export default async function StudyDownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return <Invalid />
  }

  const resolution = await resolveGuide(token)

  // Jeton inconnu : ni mesure, ni redirection. L'API répondrait 404 et le
  // visiteur atterrirait sur du JSON.
  if (resolution.status === 'unknown') {
    return <Invalid />
  }

  return (
    <DownloadRelay
      token={token}
      guideId={resolution.status === 'ok' ? resolution.slug : null}
    />
  )
}

function Invalid() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-center">
      <div className="max-w-md">
        <h1 className="mb-3 font-serif text-2xl text-[#171717]">Lien invalide</h1>
        <p className="text-[#555]">
          Ce lien de téléchargement est incomplet ou a expiré. Redemandez l’étude
          depuis la page de l’étude et un nouveau lien vous sera envoyé.
        </p>
      </div>
    </main>
  )
}
