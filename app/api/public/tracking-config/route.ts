import { NextResponse } from 'next/server'
import { getIntegrationValue } from '@/lib/integration-settings'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/tracking-config
 *
 * Identifiants de mesure destinés au NAVIGATEUR. Aucun secret ici : un
 * identifiant de pixel est visible dans le code de n'importe quelle page qui
 * le charge. Le jeton Conversions API, lui, ne quitte jamais le serveur.
 *
 * Pourquoi cette route alors que le layout pose déjà l'identifiant ?
 * Les pages publiques sont rendues à la construction : la valeur injectée dans
 * leur HTML est celle du dernier déploiement. Sans lecture à l'exécution,
 * changer le pixel dans /admin/integrations n'aurait d'effet sur ces pages
 * qu'au redéploiement suivant — exactement ce que la recette reproche.
 */
export async function GET() {
  try {
    const fbPixelId = await getIntegrationValue('meta_pixel_id')
    return NextResponse.json(
      { fbPixelId: fbPixelId || null },
      // Court, mais suffisant pour ne pas interroger la base à chaque page.
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
    )
  } catch {
    // La mesure ne doit jamais faire échouer une page : le navigateur garde
    // alors la valeur posée à la construction.
    return NextResponse.json({ fbPixelId: null })
  }
}
