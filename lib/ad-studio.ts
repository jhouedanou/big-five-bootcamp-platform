import 'server-only'
import { getIntegrationValue } from '@/lib/integration-settings'

/**
 * Studio publicitaire — agent 1 (analyse de la référence) et construction du
 * prompt de l'agent 2 (génération).
 *
 * Le brief fournit un texte d'instruction écrit pour une conversation avec
 * ChatGPT : il prévoit un mode « aide », un mode « vérification » et attend que
 * l'utilisateur demande explicitement la génération. Le parcours retenu est une
 * soumission unique sans aller-retour, donc ces modes n'ont pas lieu d'être :
 * la vérification de complétude se fait côté formulaire (les champs sont connus
 * d'avance), et la génération est déclenchée par la soumission elle-même.
 * Seule la substance analytique du brief est reprise ici.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
const ANALYSIS_TIMEOUT_MS = 30_000

export const REQUIRED_FIELDS = [
  { key: 'secteur', label: 'Secteur' },
  { key: 'produit', label: 'Produit' },
  { key: 'cible', label: 'Cible' },
  { key: 'canal', label: 'Canal' },
  { key: 'ton', label: 'Ton' },
  { key: 'emotion', label: 'Émotion' },
  { key: 'objectif', label: 'Objectif' },
] as const

export const OPTIONAL_FIELDS = [
  { key: 'promesse', label: 'Promesse' },
  { key: 'marque', label: 'Marque' },
  { key: 'texte', label: 'Texte à intégrer' },
  { key: 'contraintes', label: 'Contraintes' },
  { key: 'format', label: 'Format' },
  { key: 'charte', label: 'Charte graphique' },
] as const

export type AdBrief = Record<string, string>

/** Champs obligatoires manquants, sous leur libellé affichable. */
export function missingFields(brief: AdBrief): string[] {
  return REQUIRED_FIELDS.filter((f) => !String(brief[f.key] || '').trim()).map((f) => f.label)
}

export interface ReferenceAnalysis {
  analysis: string
  framework: string
}

/** Prompt système de l'agent 1 — repris du brief fonctionnel. */
const ANALYST_SYSTEM = `Tu es un expert senior en stratégie social media, psychologie des internautes, marketing digital et analyse de contenu de marque.

Ta mission est d'analyser la publication social media envoyée de manière stratégique, concrète et orientée business.

Le ton doit être direct, intelligent, observateur, terrain et sans jargon inutile.

Évite absolument les banalités comme « beau visuel », « bonne communication », « publication engageante », « contenu attractif ».

Chaque analyse doit montrer qu'un contenu social media cache une logique commerciale, comportementale ou marketing.

L'analyse doit porter principalement sur la création visible, et non sur la légende. Analyse notamment l'accroche visuelle, la composition, la phrase centrale, le choix des personnages, le cadrage, les couleurs, les objets, la mise en scène, la hiérarchie de lecture, la psychologie utilisée, le comportement recherché, la stratégie d'attention, la logique de conversion, l'insight consommateur, l'objectif caché, la mécanique marketing et l'objectif business réel.

Relie toujours l'analyse à un objectif concret : acquisition, engagement, notoriété, fidélisation, réassurance, adoption d'un service, préférence de marque, augmentation de l'usage, augmentation des transactions, réduction des frictions, génération de leads, perception premium, mémorisation, présence mentale, téléchargement, achat, visite en boutique, inscription, demande d'installation, augmentation du panier, bouche-à-oreille.

Quand une phrase est en anglais, ajoute sa traduction française entre parenthèses.

Réponds STRICTEMENT en JSON, sans texte autour, avec exactement ces deux clés :
{
  "analysis": "L'analyse stratégique en 3 phrases maximum, suivie d'une phrase sur le détail invisible. La DERNIÈRE phrase de l'analyse stratégique doit commencer par : L'objectif business réel est de…",
  "framework": "2 phrases maximum expliquant comment une autre marque peut reproduire cette logique, la mécanique concrète applicable et le raisonnement stratégique derrière l'idée. Commence par « Le framework » ou « La mécanique ». Évite les formulations vagues comme « dans n'importe quel secteur » ou « dans d'autres univers de consommation »."
}`

/**
 * Agent 1 : analyse la création de référence.
 * Retourne null si l'analyse échoue — la génération peut se poursuivre sans,
 * avec un prompt un peu plus pauvre, plutôt que d'échouer entièrement.
 */
export async function analyzeReference(reference: {
  base64: string
  mimeType: string
}): Promise<ReferenceAnalysis | null> {
  const apiKey = await getIntegrationValue('groq_api_key')
  if (!apiKey) {
    console.warn("Studio : clé Groq absente, génération sans analyse de référence.")
    return null
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.7,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ANALYST_SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyse cette création de référence.' },
              {
                type: 'image_url',
                image_url: { url: `data:${reference.mimeType};base64,${reference.base64}` },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    })

    if (!response.ok) {
      console.error('Analyse Groq échouée:', response.status, (await response.text()).slice(0, 300))
      return null
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const analysis = String(parsed?.analysis || '').trim()
    const framework = String(parsed?.framework || '').trim()
    if (!analysis) return null

    return { analysis, framework }
  } catch (error: any) {
    console.error('Analyse de référence échouée:', error?.message || error)
    return null
  }
}

export interface TextIntent {
  accroche: string
  texte_secondaire: string
  cta: string
}

/**
 * Intention de texte : l'accroche, le texte secondaire et l'appel à l'action
 * que la création devrait porter. Produite par Groq quand la clé est là ;
 * sinon, dérivée du brief lui-même — jamais bloquante.
 */
export async function buildTextIntent(
  brief: AdBrief,
  analysis: ReferenceAnalysis | null
): Promise<TextIntent> {
  const fallback: TextIntent = {
    accroche: (brief.texte || brief.promesse || `${brief.produit || 'Votre offre'}, tout simplement.`).slice(0, 90),
    texte_secondaire: (brief.promesse && brief.texte ? brief.promesse : `Pensé pour ${brief.cible || 'vous'}.`).slice(0, 140),
    cta: 'En savoir plus',
  }

  const apiKey = await getIntegrationValue('groq_api_key')
  if (!apiKey) return fallback

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              "Tu es concepteur-rédacteur publicitaire senior pour le marché africain francophone. Réponds STRICTEMENT en JSON avec les clés accroche (percutante, 8 mots maximum), texte_secondaire (1 phrase courte qui porte la promesse) et cta (2 à 4 mots, verbe d'action). Français impeccable, pas de jargon, pas de marque inventée.",
          },
          {
            role: 'user',
            content:
              `Brief : secteur ${brief.secteur} ; produit ${brief.produit} ; cible ${brief.cible} ; canal ${brief.canal} ; ton ${brief.ton} ; émotion ${brief.emotion} ; objectif ${brief.objectif}.` +
              (brief.promesse ? ` Promesse : ${brief.promesse}.` : '') +
              (brief.texte ? ` Texte imposé à intégrer tel quel dans l'accroche : « ${brief.texte} ».` : '') +
              (analysis ? ` Mécanique de la référence : ${analysis.framework}` : ''),
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return fallback

    const data = await response.json()
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}')
    return {
      accroche: String(parsed.accroche || fallback.accroche).slice(0, 90),
      texte_secondaire: String(parsed.texte_secondaire || fallback.texte_secondaire).slice(0, 140),
      cta: String(parsed.cta || fallback.cta).slice(0, 40),
    }
  } catch (error: any) {
    console.error('Intention de texte échouée:', error?.message || error)
    return fallback
  }
}

/**
 * Prompt descriptif pour les modèles de diffusion (FLUX via Pollinations ou
 * Cloudflare). Ces modèles ne suivent pas des instructions — « ne copie pas »,
 * « adapte au canal » — ils peignent la scène qu'on leur décrit. Leur envoyer
 * le prompt d'instructions donnait des images médiocres : il faut une
 * description visuelle concrète, en anglais (meilleur suivi), avec un seul
 * texte court à rendre (le lettrage est le point faible de ces modèles).
 * Produit par Groq quand la clé est là, sinon assemblé depuis le brief.
 */
export async function buildDiffusionPrompt(
  brief: AdBrief,
  analysis: ReferenceAnalysis | null,
  intent: TextIntent
): Promise<string> {
  const fallback =
    `Professional advertising photograph for a ${brief.secteur || 'consumer'} brand, ` +
    `promoting ${brief.produit || 'a product'}. Scene featuring ${brief.cible || 'a happy customer'} in a modern African urban setting, ` +
    `authentic and aspirational, ${brief.ton || 'warm'} mood evoking ${brief.emotion || 'confidence'}. ` +
    `Bold headline text overlay in French: "${intent.accroche}". ` +
    `Clean composition with clear focal point, professional studio lighting, vivid colors, high detail, ` +
    `shot on medium format camera, advertising campaign quality. No watermark.`

  const apiKey = await getIntegrationValue('groq_api_key')
  if (!apiKey) return fallback

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 260,
        messages: [
          {
            role: 'system',
            content:
              'You write prompts for FLUX, a diffusion image model. Output ONE paragraph in English, under 110 words, purely descriptive — no instructions, no negations, no marketing jargon. Describe: the concrete scene (who, where, doing what), African francophone urban context when relevant, photographic style, lighting, mood, composition. Include exactly one short French text overlay, quoted. Never invent brand names or logos.',
          },
          {
            role: 'user',
            content:
              `Ad brief — sector: ${brief.secteur}; product: ${brief.produit}; audience: ${brief.cible}; ` +
              `channel: ${brief.canal}; tone: ${brief.ton}; emotion: ${brief.emotion}; goal: ${brief.objectif}. ` +
              (brief.charte ? `Visual identity: ${brief.charte}. ` : '') +
              (analysis ? `Mechanic to transpose (not copy): ${analysis.framework} ` : '') +
              `French text overlay to render: "${intent.accroche}".`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return fallback

    const data = await response.json()
    const text = String(data?.choices?.[0]?.message?.content || '').trim()
    return text.length > 30 ? text.slice(0, 900) : fallback
  } catch (error: any) {
    console.error('Prompt de diffusion échoué:', error?.message || error)
    return fallback
  }
}

/** Libellé lisible d'un champ, pour l'injection dans le prompt de génération. */
function line(label: string, value: string | undefined): string {
  const v = String(value || '').trim()
  return v ? `- ${label} : ${v}` : ''
}

/**
 * Agent 2 : construit le prompt de génération.
 * Les règles du brief sont conservées telles quelles — ne pas copier le visuel
 * d'origine mais en reprendre la logique, message lisible en moins de trois
 * secondes, pas de marque inventée.
 */
export function buildGenerationPrompt(brief: AdBrief, analysis: ReferenceAnalysis | null): string {
  const contexte = [
    line('Secteur', brief.secteur),
    line('Produit', brief.produit),
    line('Cible', brief.cible),
    line('Canal', brief.canal),
    line('Ton', brief.ton),
    line('Émotion', brief.emotion),
    line('Objectif', brief.objectif),
    line('Promesse', brief.promesse),
    line('Marque', brief.marque),
    line('Texte à intégrer', brief.texte),
    line('Contraintes', brief.contraintes),
    line('Format', brief.format),
    line('Charte graphique', brief.charte),
  ]
    .filter(Boolean)
    .join('\n')

  const referenceBloc = analysis
    ? `LOGIQUE DE LA CRÉATION DE RÉFÉRENCE (fournie en image)
Analyse : ${analysis.analysis}
Mécanique réplicable : ${analysis.framework}`
    : `LOGIQUE DE LA CRÉATION DE RÉFÉRENCE
L'image fournie sert de référence : reprends sa logique d'attention et de composition, pas son contenu.`

  return `Tu es directeur de création. Produis UNE nouvelle publicité visuelle.

${referenceBloc}

NOUVEAU PROJET
${contexte}

RÈGLES IMPÉRATIVES
- Ne copie jamais le visuel de référence. Reprends uniquement sa logique : accroche visuelle, captation de l'attention, émotion, bénéfice, rôle des éléments, structure du message, objectif marketing.
- N'invente aucune marque : n'affiche un nom que s'il est fourni ci-dessus.
- Adapte le message au canal indiqué.
- Le message doit être lisible en moins de trois secondes.
- Transforme le bénéfice en scène visuelle concrète, pas en slogan posé sur un fond.
- Évite les visuels génériques de banque d'images.
- Le texte présent dans l'image doit être court, juste et orthographié correctement en français.

Génère directement l'image finale.`
}
