import type { SupabaseClient } from '@supabase/supabase-js'

import { DOCUMENTS_BUCKET } from '@/lib/storage-buckets'

/**
 * Emplacement et lien de lecture du devis PDF d'une demande de marque.
 *
 * Un devis vit dans le bucket PRIVÉ `documents` et n'a donc pas d'URL publique.
 * `brand_requests.devis_url` ne retient pas l'objet lui-même mais le lien vers
 * la route qui signe à la demande — d'où l'absence de migration de schéma : la
 * colonne garde son nom et son type, seul son contenu change de nature.
 */

/** `brand_requests.id` est un uuid : refuser le reste avant de toucher à Postgres. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isBrandRequestId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Chemin de l'objet dans `documents`. Déterministe : une demande n'a qu'un
 * devis à la fois et « Remplacer » écrase le précédent au même endroit (upsert).
 * Rien à mémoriser côté base, donc rien à désynchroniser.
 */
export function devisObjectPath(brandRequestId: string): string {
  return `brand-requests/${brandRequestId}/devis.pdf`
}

/**
 * Lien stable stocké dans `devis_url`, rendu dans l'admin, le tableau de bord et
 * les e-mails. Relatif à dessein : une URL absolue figée en base survivrait mal
 * à un changement de domaine, et l'application tourne sous deux origines
 * (Cloudflare Workers et Vercel). Les e-mails l'absolutisent à l'envoi.
 */
export function devisReadPath(brandRequestId: string): string {
  return `/api/brand-requests/${brandRequestId}/devis`
}

/** Vrai si `value` est exactement le lien de lecture attendu pour cette demande. */
export function isDevisReadPath(value: unknown, brandRequestId: string): boolean {
  return typeof value === 'string' && value === devisReadPath(brandRequestId)
}

/**
 * Supprime le PDF du bucket privé. Best-effort : un échec ici ne doit jamais
 * empêcher la mise à jour de la demande, mais laisser l'objet derrière un devis
 * retiré ou refusé serait une rétention de données non voulue.
 */
export async function removeDevisObject(
  admin: SupabaseClient<any, any, any>,
  brandRequestId: string,
): Promise<void> {
  const { error } = await admin.storage
    .from(DOCUMENTS_BUCKET.name)
    .remove([devisObjectPath(brandRequestId)])

  if (error) {
    console.error(
      `[brand-requests/devis] suppression de l'objet ${brandRequestId} échouée :`,
      error.message,
    )
  }
}
