import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import {
  INTEGRATION_FIELDS,
  getIntegrationStatuses,
  saveIntegrationValues,
} from '@/lib/integration-settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations
 * Définition des champs + état de chacun.
 *
 * Ne renvoie JAMAIS un secret en clair : les champs sensibles sortent masqués
 * (quatre derniers caractères), assez pour vérifier qu'on a la bonne clé.
 */
export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    return NextResponse.json({
      fields: INTEGRATION_FIELDS,
      statuses: await getIntegrationStatuses(),
    })
  } catch (error: any) {
    console.error('Erreur GET intégrations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/integrations
 * Body: { values: { <clé>: "<valeur>" } }
 *
 * Seules les clés effectivement envoyées sont modifiées : le formulaire
 * n'envoie que les champs saisis, pour qu'un champ laissé masqué à l'écran ne
 * vienne pas écraser le secret existant par sa version en points.
 */
export async function PATCH(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const payload = await request.json().catch(() => null)
    const values = (payload as any)?.values

    if (!values || typeof values !== 'object') {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const result = await saveIntegrationValues(values)
    if (result.error) {
      return NextResponse.json(
        { error: `Enregistrement échoué : ${result.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      saved: result.saved,
      statuses: await getIntegrationStatuses(),
    })
  } catch (error: any) {
    console.error('Erreur PATCH intégrations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
