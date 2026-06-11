import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"

/** Clé site_settings du flag preview promo (pilotable depuis l'admin). */
export const PROMO_PREVIEW_SETTING_KEY = "promo_preview_mode"

function isTruthyFlag(value: string | null | undefined): boolean {
  const v = (value || "").trim().toLowerCase()
  return v === "1" || v === "true" || v === "on" || v === "yes"
}

/** Le flag preview est-il activé (env OU réglage admin), indépendamment du rôle ? */
export async function isPromoPreviewFlagEnabled(): Promise<boolean> {
  if (isTruthyFlag(process.env.PROMO_PREVIEW_MODE)) return true
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", PROMO_PREVIEW_SETTING_KEY)
      .maybeSingle<{ value: string | null }>()
    return isTruthyFlag(data?.value)
  } catch {
    return false
  }
}

/**
 * Mode preview promo (LOT K — QA T28–T39).
 *
 * Permet de prévisualiser la mécanique promo HORS période réelle
 * (bannière, popup, badges, compte à rebours, offres checkout) pour la
 * tester avant la mise en ligne du 01/07.
 *
 * Conditions cumulatives — jamais activable par un utilisateur normal :
 *  1. le flag preview est actif, via SOIT la variable d'environnement
 *     PROMO_PREVIEW_MODE (environnement de test), SOIT le réglage admin
 *     `promo_preview_mode` dans site_settings (toggle /admin/settings) ;
 *  2. l'utilisateur courant est ADMIN (session vérifiée côté serveur).
 *
 * Le point 2 garantit qu'un utilisateur normal ne voit JAMAIS la promo hors
 * période, même si le flag est laissé actif par erreur en production.
 */
export async function isPromoPreviewGranted(): Promise<boolean> {
  try {
    const admin = await checkAdmin()
    if (!admin) return false
  } catch {
    return false
  }
  return isPromoPreviewFlagEnabled()
}
