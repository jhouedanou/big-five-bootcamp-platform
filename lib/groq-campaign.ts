/**
 * Groq-powered campaign generator (free tier).
 *
 * Hybride : on extrait les insights structurés via l'heuristique
 * (`extractInsights` côté `campaign-generator.ts`), on envoie un JSON
 * compact à Groq (Llama 3.3 70B versatile), et on reçoit un objet JSON
 * strict (concept, accroches, message, angles, CTA, plan, intention visuelle).
 *
 * Si la clé manque, si Groq répond mal, ou si le timeout saute, on rend
 * `null` et l'appelant retombe sur le générateur heuristique déterministe.
 */

import type {
  CampaignBrief,
  CampaignInsights,
  GeneratedCampaign,
  GeneratorCampaign,
} from "@/lib/campaign-generator"

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"
const REQUEST_TIMEOUT_MS = 12_000
const MAX_SOURCE_SAMPLES = 6
const MAX_TEXT_CHARS = 380

function stripHtmlPlain(input?: string | null): string {
  if (!input) return ""
  return String(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function clamp(text: string, max: number): string {
  if (!text) return ""
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + "…"
}

interface GroqExtract {
  brand: string | null
  title: string | null
  axe: string[] | null
  tags: string[] | null
  excerpt: string
}

function buildSourceSamples(campaigns: GeneratorCampaign[]): GroqExtract[] {
  return campaigns.slice(0, MAX_SOURCE_SAMPLES).map((c) => {
    const blob = [c.summary, c.analyse, c.description, c.how_to_use]
      .map(stripHtmlPlain)
      .filter(Boolean)
      .join(" — ")
    return {
      brand: c.brand ?? null,
      title: c.title ?? null,
      axe: c.axe?.slice(0, 4) ?? null,
      tags: c.tags?.slice(0, 6) ?? null,
      excerpt: clamp(blob, MAX_TEXT_CHARS),
    }
  })
}

interface GroqCampaignPayload {
  concept: string
  accroches: string[]
  message: string
  angles: string[]
  cta: string
  plan: string
  visual: {
    description: string
    style: string
    palette: string
    composition: string
    prompt: string
  }
}

const SYSTEM_PROMPT = `Tu es directeur de création publicitaire francophone, spécialiste du marché africain (Côte d'Ivoire, Sénégal, Cameroun, etc.) et international.
À partir d'un brief client et d'une liste de campagnes que l'utilisateur a sauvegardées, tu produis une proposition de campagne concrète, ancrée dans le brief, qui s'inspire des références sans les copier.
Tu écris en français, ton clair et direct, sans formules creuses ("dans un monde où…", "à l'heure où…").
Les accroches sont courtes (8 mots max), mémorables, sans clichés.
Tu réponds STRICTEMENT en JSON valide UTF-8, sans markdown, sans commentaire, sans texte hors JSON.`

function buildUserPrompt(args: {
  brief: CampaignBrief
  insights: CampaignInsights
  samples: GroqExtract[]
  channel: string
}): string {
  const { brief, insights, samples, channel } = args
  return [
    "BRIEF CLIENT",
    JSON.stringify(
      {
        marque: brief.brand || null,
        produit: brief.product || null,
        objectif: brief.objective || null,
        canal: channel,
        audience: brief.audience || null,
        ton: brief.tone || null,
      },
      null,
      0,
    ),
    "",
    "SIGNAUX EXTRAITS DES FAVORIS (analyse heuristique)",
    JSON.stringify(
      {
        nb_references: insights.campaignCount,
        mots_cles: insights.topKeywords,
        axes: insights.topAxes,
        plateformes: insights.topPlatforms,
        formats: insights.topFormats,
        marques_inspirantes: insights.brandsReferenced,
        periode: insights.yearsRange,
      },
      null,
      0,
    ),
    "",
    "ÉCHANTILLON DE RÉFÉRENCES",
    JSON.stringify(samples, null, 0),
    "",
    "FORMAT DE RÉPONSE (JSON strict, AUCUN autre texte)",
    JSON.stringify(
      {
        concept: "phrase d'ouverture qui résume le concept de campagne (1-2 phrases, max 280 caractères)",
        accroches: ["3 accroches courtes (8 mots max)", "distinctes", "mémorables"],
        message: "message clé argumenté (3-5 phrases) qui croise le brief et les signaux des favoris",
        angles: ["3 angles stratégiques à exploiter", "chacun explicite et actionnable", "ancré dans le brief"],
        cta: "call-to-action court et tranchant",
        plan: "plan de diffusion en 2-4 phrases : canal principal, déclinaisons, temps forts",
        visual: {
          description: "description du visuel principal en une phrase narrative",
          style: "style visuel (photo / illu / mixed media), traitement, lumière",
          palette: "palette de couleurs dominantes",
          composition: "composition, format, ratio, focal, intention",
          prompt: "prompt court (1 ligne) prêt à copier dans Midjourney/Imagen/DALL·E",
        },
      },
      null,
      0,
    ),
  ].join("\n")
}

function safeParseJSON(text: string): GroqCampaignPayload | null {
  if (!text) return null
  // Tolérance : Groq peut entourer de ```json … ```
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!parsed || typeof parsed !== "object") return null
    if (
      typeof parsed.concept !== "string" ||
      !Array.isArray(parsed.accroches) ||
      typeof parsed.message !== "string" ||
      !Array.isArray(parsed.angles) ||
      typeof parsed.cta !== "string" ||
      typeof parsed.plan !== "string" ||
      !parsed.visual ||
      typeof parsed.visual !== "object"
    ) {
      return null
    }
    return parsed as GroqCampaignPayload
  } catch {
    return null
  }
}

function renderCampaignText(p: GroqCampaignPayload): string {
  const accroches = p.accroches.slice(0, 5).map((a, i) => `${i + 1}. ${a}`)
  const angles = p.angles.slice(0, 5).map((a) => `• ${a}`)
  return [
    "🎯 CONCEPT",
    p.concept,
    "",
    "✏️ ACCROCHES",
    ...accroches,
    "",
    "📝 MESSAGE CLÉ",
    p.message,
    "",
    "💡 ANGLES À EXPLOITER",
    ...angles,
    "",
    "📣 CALL-TO-ACTION",
    `${p.cta} →`,
    "",
    "📡 PLAN DE DIFFUSION",
    p.plan,
  ].join("\n")
}

function renderVisualIntent(p: GroqCampaignPayload): string {
  return [
    "🎨 INTENTION VISUELLE",
    "À coller dans votre générateur d'images (Midjourney, DALL·E, Firefly, Imagen…).",
    "",
    `Sujet : ${p.visual.description}`,
    `Style : ${p.visual.style}`,
    `Palette : ${p.visual.palette}`,
    `Composition : ${p.visual.composition}`,
    "",
    "Prompt court (copier-coller) :",
    p.visual.prompt,
  ].join("\n")
}

export async function generateCampaignWithGroq(args: {
  campaigns: GeneratorCampaign[]
  brief: CampaignBrief
  insights: CampaignInsights
}): Promise<(GeneratedCampaign & { source: "groq" }) | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  const channel =
    (args.brief.channel || "").trim() ||
    args.insights.topPlatforms[0] ||
    "réseaux sociaux"
  const samples = buildSourceSamples(args.campaigns)
  const userPrompt = buildUserPrompt({
    brief: args.brief,
    insights: args.insights,
    samples,
    channel,
  })

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
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      console.warn("[groq-campaign] HTTP", res.status, await res.text().catch(() => ""))
      return null
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data?.choices?.[0]?.message?.content ?? ""
    const parsed = safeParseJSON(content)
    if (!parsed) {
      console.warn("[groq-campaign] JSON parse failed")
      return null
    }

    return {
      insights: args.insights,
      campaignText: renderCampaignText(parsed),
      visualIntent: renderVisualIntent(parsed),
      source: "groq",
    }
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      console.warn("[groq-campaign] timeout after", REQUEST_TIMEOUT_MS, "ms")
    } else {
      console.warn("[groq-campaign] error", err)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}
