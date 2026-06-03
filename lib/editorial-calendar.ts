/**
 * Calendrier éditorial — génère un planning de publications multi-semaines à
 * partir du même brief / insights que le générateur de campagnes.
 *
 * Stratégie robuste : les CRÉNEAUX (date + canal) sont calculés ici de façon
 * déterministe, puis on demande au LLM de remplir UNIQUEMENT le contenu de
 * chaque créneau (thème, accroche, texte, CTA, format, hashtags). On ne fait
 * jamais confiance au LLM pour les dates → planning toujours valide et de la
 * bonne longueur. Si Groq est indisponible, fallback heuristique déterministe.
 */

import type { CampaignBrief, CampaignInsights } from "@/lib/campaign-generator"

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"
const REQUEST_TIMEOUT_MS = 15_000

export interface EditorialSlot {
  /** Date ISO (YYYY-MM-DD). */
  date: string
  channel: string
}

export interface EditorialPost extends EditorialSlot {
  format: string
  theme: string
  hook: string
  copy: string
  cta: string
  hashtags: string[]
}

export interface EditorialCalendar {
  posts: EditorialPost[]
  source: "groq" | "heuristic"
}

export interface CalendarParams {
  /** Nombre de semaines (1-8). */
  weeks: number
  /** Publications par semaine (1-7). */
  postsPerWeek: number
  /** Date de début ISO (YYYY-MM-DD). */
  startDate: string
  /** Canaux à faire tourner. Si vide → canal du brief. */
  channels: string[]
}

// --- Bornes & utilitaires -------------------------------------------------

export function clampParams(p: Partial<CalendarParams>): CalendarParams {
  const weeks = Math.min(8, Math.max(1, Math.round(p.weeks ?? 4)))
  const postsPerWeek = Math.min(7, Math.max(1, Math.round(p.postsPerWeek ?? 3)))
  const startDate =
    p.startDate && /^\d{4}-\d{2}-\d{2}$/.test(p.startDate)
      ? p.startDate
      : new Date().toISOString().slice(0, 10)
  const channels = (p.channels || []).map((c) => String(c).trim()).filter(Boolean)
  return { weeks, postsPerWeek, startDate, channels }
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Format conseillé selon le canal (cohérent avec le générateur). */
function formatForChannel(channel: string): string {
  const c = channel.toLowerCase()
  if (c.includes("tiktok") || c.includes("reel") || c.includes("short"))
    return "Vidéo verticale 9:16"
  if (c.includes("youtube") || c.includes("tv")) return "Vidéo 16:9"
  if (c.includes("linkedin")) return "Post 1:1 + texte long"
  if (c.includes("affich") || c.includes("ooh") || c.includes("print"))
    return "Visuel affiche"
  if (c.includes("email")) return "Newsletter"
  if (c.includes("insta") || c.includes("facebook") || c.includes("meta"))
    return "Carrousel / Reel 4:5"
  return "Post 1:1"
}

/**
 * Construit les créneaux (date + canal) répartis sur les semaines. Les jours
 * sont espacés dans la semaine ; les canaux tournent sur la liste fournie.
 */
export function buildSlots(params: CalendarParams, briefChannel: string): EditorialSlot[] {
  const channels =
    params.channels.length > 0 ? params.channels : [briefChannel || "Instagram"]
  const slots: EditorialSlot[] = []
  let k = 0
  for (let w = 0; w < params.weeks; w++) {
    for (let i = 0; i < params.postsPerWeek; i++) {
      const dayOffset = Math.floor((i * 7) / params.postsPerWeek)
      slots.push({
        date: addDaysISO(params.startDate, w * 7 + dayOffset),
        channel: channels[k % channels.length],
      })
      k++
    }
  }
  return slots
}

// --- Heuristique (fallback déterministe) ---------------------------------

function pick<T>(arr: T[], i: number, fallback: T): T {
  return arr.length ? arr[i % arr.length] : fallback
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export function generateEditorialCalendarHeuristic(
  slots: EditorialSlot[],
  brief: CampaignBrief,
  insights: CampaignInsights,
): EditorialCalendar {
  const brand = (brief.brand || "").trim() || "votre marque"
  const kw = insights.topKeywords
  const axes = insights.topAxes

  const posts: EditorialPost[] = slots.map((slot, idx) => {
    const theme = pick(kw, idx, axes.length ? pick(axes, idx, "votre univers") : "votre univers")
    const angle = pick(axes, idx, theme)
    return {
      ...slot,
      format: formatForChannel(slot.channel),
      theme: capitalize(theme),
      hook: `${capitalize(theme)} : ce que ${brand} change.`,
      copy:
        `${capitalize(brand)} prend la parole sur ${slot.channel} autour de « ${theme} ». ` +
        `Mettez en avant ${angle}. Visuel clair, message court, une seule idée.`,
      cta: idx % 2 === 0 ? `Découvrez ${brand}` : "En savoir plus",
      hashtags: [brand.replace(/\s+/g, ""), String(theme).replace(/\s+/g, "")]
        .filter(Boolean)
        .map((h) => "#" + h),
    }
  })

  return { posts, source: "heuristic" }
}

// --- Groq -----------------------------------------------------------------

const SYSTEM_PROMPT = `Tu es responsable du planning éditorial d'une marque, spécialiste des réseaux sociaux en Afrique francophone et à l'international.
On te donne un brief, des signaux extraits de campagnes de référence, et une liste de créneaux (date + canal).
Pour CHAQUE créneau, tu rédiges le contenu d'une publication : thème, accroche courte, texte de post court, call-to-action, format adapté au canal, et 2 à 4 hashtags.
Tu écris en français, ton clair et direct, sans formules creuses. Tu varies les angles d'un post à l'autre (pas de répétition).
Tu réponds STRICTEMENT en JSON valide UTF-8, sans markdown ni texte hors JSON.`

interface GroqPostPayload {
  theme?: string
  hook?: string
  copy?: string
  cta?: string
  format?: string
  hashtags?: string[]
}

function safeParsePosts(text: string): GroqPostPayload[] | null {
  if (!text) return null
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    const arr = Array.isArray(parsed) ? parsed : parsed?.posts
    if (!Array.isArray(arr)) return null
    return arr as GroqPostPayload[]
  } catch {
    return null
  }
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback
}

export async function generateEditorialCalendarWithGroq(args: {
  slots: EditorialSlot[]
  brief: CampaignBrief
  insights: CampaignInsights
  /** Concept de campagne déjà généré (optionnel) pour ancrer le planning. */
  concept?: string | null
}): Promise<EditorialCalendar | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || args.slots.length === 0) return null

  const userPrompt = [
    "BRIEF",
    JSON.stringify(
      {
        marque: args.brief.brand || null,
        produit: args.brief.product || null,
        description: args.brief.description || null,
        objectif: args.brief.objective || null,
        audience: args.brief.audience || null,
        ton: args.brief.tone || null,
      },
      null,
      0,
    ),
    "",
    "SIGNAUX (favoris)",
    JSON.stringify(
      {
        mots_cles: args.insights.topKeywords,
        axes: args.insights.topAxes,
        plateformes: args.insights.topPlatforms,
      },
      null,
      0,
    ),
    args.concept ? "\nCONCEPT DE CAMPAGNE\n" + args.concept.slice(0, 800) : "",
    "",
    `CRÉNEAUX (${args.slots.length}) — réponds avec EXACTEMENT ${args.slots.length} posts dans le même ordre`,
    JSON.stringify(
      args.slots.map((s, i) => ({ index: i, date: s.date, canal: s.channel })),
      null,
      0,
    ),
    "",
    "FORMAT (JSON strict) :",
    JSON.stringify(
      {
        posts: [
          {
            theme: "thème du post (court)",
            hook: "accroche courte (8 mots max)",
            copy: "texte du post (2-4 phrases), adapté au canal",
            cta: "call-to-action court",
            format: "format conseillé pour ce canal",
            hashtags: ["#tag1", "#tag2"],
          },
        ],
      },
      null,
      0,
    ),
  ].join("\n")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.8,
        top_p: 0.9,
        max_tokens: 2400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn("[editorial-calendar] HTTP", res.status, await res.text().catch(() => ""))
      return null
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const parsed = safeParsePosts(data?.choices?.[0]?.message?.content ?? "")
    if (!parsed) {
      console.warn("[editorial-calendar] JSON parse failed")
      return null
    }

    // On zippe le contenu LLM avec NOS créneaux (dates/canaux fiables).
    const posts: EditorialPost[] = args.slots.map((slot, i) => {
      const p = parsed[i] || {}
      return {
        ...slot,
        format: str(p.format, formatForChannel(slot.channel)),
        theme: str(p.theme, "Publication"),
        hook: str(p.hook, ""),
        copy: str(p.copy, ""),
        cta: str(p.cta, ""),
        hashtags: Array.isArray(p.hashtags)
          ? p.hashtags.map((h) => str(h)).filter(Boolean).slice(0, 6)
          : [],
      }
    })
    return { posts, source: "groq" }
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      console.warn("[editorial-calendar] timeout")
    } else {
      console.warn("[editorial-calendar] error", err)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}
