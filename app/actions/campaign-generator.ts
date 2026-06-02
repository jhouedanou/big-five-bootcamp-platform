"use server"

import { getAuthenticatedUser } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { canAccessPremiumContent } from "@/lib/pricing"
import {
  extractInsights,
  generateCampaign,
  type CampaignBrief,
  type GeneratedCampaign,
  type GeneratorCampaign,
} from "@/lib/campaign-generator"
import { generateCampaignWithGroq } from "@/lib/groq-campaign"
import { getGoogleDriveImageUrl } from "@/lib/utils"

// Champs "carte" exposés au client pour afficher les sources (aucun champ premium).
const SOURCE_CARD_COLUMNS = "id, title, brand, category, thumbnail, slug"
// Champs texte complets pour l'analyse — restent côté serveur, jamais renvoyés au client.
const SOURCE_TEXT_COLUMNS =
  "id, title, summary, description, analyse, how_to_use, brand, category, axe, tags, platforms, format, country, year, thumbnail"

// Limites pour le visuel envoyé au LLM (vision) : 1 image, max ~4 Mo encodés.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export interface SourceCampaign {
  id: string
  title: string | null
  brand: string | null
  category: string | null
  thumbnail: string | null
  slug: string | null
}

export interface SourceCollection {
  id: string
  name: string
  campaignIds: string[]
}

export interface GeneratorSources {
  locked: boolean
  authenticated: boolean
  favorites: SourceCampaign[]
  collections: SourceCollection[]
  /** Cartes de TOUTES les campagnes citées (favoris + items de collections),
   *  dédupliquées, pour afficher titre/marque des campagnes de collection
   *  même quand elles ne sont pas en favori. */
  campaigns: SourceCampaign[]
}

async function resolveAccess() {
  const user = await getAuthenticatedUser()
  if (!user) return { user: null, canPremium: false }
  const plan = (user.profile as any)?.plan
  const canPremium = !!user.isAdmin || canAccessPremiumContent(plan)
  return { user, canPremium }
}

/**
 * Charge les favoris et collections de l'utilisateur connecté (champs carte
 * uniquement) pour alimenter le générateur. Réservé aux comptes Basic/Pro.
 */
export async function getGeneratorSources(): Promise<GeneratorSources> {
  const { user, canPremium } = await resolveAccess()
  if (!user) {
    return { locked: false, authenticated: false, favorites: [], collections: [], campaigns: [] }
  }
  if (!canPremium) {
    return { locked: true, authenticated: true, favorites: [], collections: [], campaigns: [] }
  }

  const admin = getSupabaseAdmin()

  const { data: favRows } = await (admin as any)
    .from("favorites")
    .select("campaign_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  const favoriteIds: string[] = (favRows || []).map((f: any) => f.campaign_id)

  const { data: colRows } = await (admin as any)
    .from("collections")
    .select("id, name")
    .eq("user_id", user.id)
  const collectionList = (colRows || []) as { id: string; name: string }[]

  let itemRows: { collection_id: string; campaign_id: string }[] = []
  if (collectionList.length > 0) {
    const { data } = await (admin as any)
      .from("collection_items")
      .select("collection_id, campaign_id")
      .in(
        "collection_id",
        collectionList.map((c) => c.id),
      )
    itemRows = (data || []) as { collection_id: string; campaign_id: string }[]
  }

  const collections: SourceCollection[] = collectionList.map((c) => ({
    id: c.id,
    name: c.name,
    campaignIds: itemRows.filter((i) => i.collection_id === c.id).map((i) => i.campaign_id),
  }))

  const allIds = Array.from(
    new Set([...favoriteIds, ...itemRows.map((i) => i.campaign_id)]),
  )

  let cards: SourceCampaign[] = []
  if (allIds.length > 0) {
    const { data } = await (admin as any)
      .from("campaigns")
      .select(SOURCE_CARD_COLUMNS)
      .in("id", allIds)
    cards = (data || []) as SourceCampaign[]
  }
  const cardById = new Map(cards.map((c) => [c.id, c]))

  // Favoris ordonnés comme renvoyés (récents d'abord), filtrés aux campagnes existantes.
  const favorites = favoriteIds
    .map((id) => cardById.get(id))
    .filter((c): c is SourceCampaign => !!c)

  return { locked: false, authenticated: true, favorites, collections, campaigns: cards }
}

export interface GenerateInput {
  campaignIds: string[]
  brief: CampaignBrief
  /** Si vrai, on joint le visuel de la 1re campagne sélectionnée au LLM (vision). */
  useVisuals?: boolean
}

// Anti-SSRF : on ne fetch QUE des hôtes d'images Google connus. `thumbnail`
// vient de la base mais reste une donnée non fiable (admin / import) : un
// thumbnail pointant vers une IP interne (169.254.169.254, 10.x, localhost…)
// permettrait sinon une SSRF côté serveur. Allowlist par hostname exact.
function isAllowedImageHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === "drive.google.com" ||
    h === "script.google.com" ||
    h === "script.googleusercontent.com" ||
    h === "googleusercontent.com" ||
    h.endsWith(".googleusercontent.com") ||
    h.endsWith(".googleapis.com")
  )
}

/** Valide une URL : protocole https + hôte dans l'allowlist. */
function safeImageUrl(raw: string): URL | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== "https:") return null
  if (!isAllowedImageHost(u.hostname)) return null
  return u
}

/**
 * Récupère un visuel (thumbnail) et le convertit en data URL base64 pour
 * l'envoyer au modèle vision. Renvoie null si indisponible / trop lourd /
 * non-image / hôte non autorisé. Les URLs Google Drive sont normalisées en
 * lien direct, puis chaque saut de redirection est re-validé (anti-SSRF).
 */
async function fetchImageAsDataUrl(rawUrl?: string | null): Promise<string | null> {
  const url = (rawUrl || "").trim()
  if (!url) return null
  try {
    let current = safeImageUrl(getGoogleDriveImageUrl(url))
    if (!current) return null

    // Redirections en mode manuel : on re-valide l'hôte à chaque saut pour
    // empêcher un rebond vers une cible interne.
    let res: Response | null = null
    for (let hop = 0; hop < 4; hop++) {
      res = await fetch(current.toString(), { redirect: "manual" })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location")
        if (!loc) return null
        const next = safeImageUrl(new URL(loc, current).toString())
        if (!next) return null
        current = next
        res = null
        continue
      }
      break
    }
    if (!res || !res.ok) return null

    const contentType = res.headers.get("content-type") || ""
    if (!contentType.startsWith("image/")) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null
    const base64 = Buffer.from(buf).toString("base64")
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

export type GenerateResult =
  | { success: true; data: GeneratedCampaign & { source: "groq" | "heuristic" } }
  | { success: false; error: string }

/**
 * Génère un texte de campagne + une intention visuelle à partir d'une sélection
 * de campagnes (favoris / collection) et du brief de destination. Le texte
 * premium des campagnes est lu côté serveur et n'est jamais renvoyé au client :
 * seule la synthèse l'est.
 */
export async function generateCampaignFromSources(
  input: GenerateInput,
): Promise<GenerateResult> {
  const { user, canPremium } = await resolveAccess()
  if (!user) return { success: false, error: "Authentification requise." }
  if (!canPremium) return { success: false, error: "Réservé aux abonnés Basic ou Pro." }

  const requested = Array.from(new Set(input.campaignIds || [])).filter(Boolean)
  if (requested.length === 0) {
    return { success: false, error: "Sélectionnez au moins une campagne favorite." }
  }

  const admin = getSupabaseAdmin()

  // Périmètre autorisé : uniquement les campagnes des favoris / collections du user.
  const { data: favRows } = await (admin as any)
    .from("favorites")
    .select("campaign_id")
    .eq("user_id", user.id)
  const { data: colRows } = await (admin as any)
    .from("collections")
    .select("id")
    .eq("user_id", user.id)
  const colIds = (colRows || []).map((c: any) => c.id)
  let itemIds: string[] = []
  if (colIds.length > 0) {
    const { data } = await (admin as any)
      .from("collection_items")
      .select("campaign_id")
      .in("collection_id", colIds)
    itemIds = (data || []).map((i: any) => i.campaign_id)
  }
  const allowed = new Set<string>([
    ...(favRows || []).map((f: any) => f.campaign_id),
    ...itemIds,
  ])
  const ids = requested.filter((id) => allowed.has(id))
  if (ids.length === 0) {
    return { success: false, error: "Aucune campagne valide dans votre sélection." }
  }

  const { data, error } = await (admin as any)
    .from("campaigns")
    .select(SOURCE_TEXT_COLUMNS)
    .in("id", ids)

  if (error) return { success: false, error: "Erreur lors du chargement des favoris." }

  const campaigns = (data || []) as GeneratorCampaign[]
  const insights = extractInsights(campaigns)

  // Visuel optionnel : thumbnail de la 1re campagne sélectionnée (ordre demandé).
  let imageDataUrl: string | null = null
  if (input.useVisuals) {
    const byId = new Map(campaigns.map((c) => [c.id as string, c]))
    const firstWithThumb =
      ids.map((id) => byId.get(id)).find((c) => !!c?.thumbnail) || campaigns[0]
    imageDataUrl = await fetchImageAsDataUrl(firstWithThumb?.thumbnail)
  }

  // Tentative IA (Groq, gratuit) — fallback heuristique si indisponible.
  const aiResult = await generateCampaignWithGroq({
    campaigns,
    brief: input.brief,
    insights,
    imageDataUrl,
  })
  if (aiResult) {
    return { success: true, data: aiResult }
  }

  const heuristic = generateCampaign(campaigns, input.brief)
  return { success: true, data: { ...heuristic, source: "heuristic" } }
}
