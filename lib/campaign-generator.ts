/**
 * Générateur de campagnes — moteur heuristique (sans appel IA externe).
 *
 * Analyse le texte des campagnes favorites de l'utilisateur (titres, résumés,
 * descriptions, analyses stratégiques, axes, tags…) et, combiné au brief de
 * destination saisi par l'utilisateur (marque, objectif, canal, audience, ton),
 * produit :
 *   - un texte de campagne prêt à l'emploi,
 *   - une intention visuelle à copier dans un générateur d'images,
 *   - une synthèse des signaux détectés dans les favoris.
 *
 * 100 % déterministe : aucune dépendance réseau, aucune clé, aucun coût. Les
 * résultats sont ancrés dans le contenu réel des favoris, pas inventés.
 */

export interface GeneratorCampaign {
  id?: string
  title?: string | null
  summary?: string | null
  description?: string | null
  analyse?: string | null
  how_to_use?: string | null
  brand?: string | null
  category?: string | null
  axe?: string[] | null
  tags?: string[] | null
  platforms?: string[] | null
  format?: string | null
  country?: string | null
  year?: number | null
  thumbnail?: string | null
}

export interface CampaignBrief {
  brand?: string
  product?: string
  /** Description libre de la marque / du service, saisie par l'utilisateur. */
  description?: string
  objective?: string
  channel?: string
  audience?: string
  tone?: string
}

export interface CampaignInsights {
  campaignCount: number
  topKeywords: string[]
  topAxes: string[]
  topPlatforms: string[]
  topFormats: string[]
  topCategories: string[]
  brandsReferenced: string[]
  yearsRange: string | null
}

export interface GeneratedCampaign {
  insights: CampaignInsights
  campaignText: string
  visualIntent: string
}

// --- Outils texte --------------------------------------------------------

function stripHtml(input?: string | null): string {
  if (!input) return ''
  return String(input)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Mots vides français + termes trop génériques du domaine (bruit pour l'analyse).
const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux', 'et', 'ou',
  'à', 'a', 'en', 'dans', 'pour', 'par', 'sur', 'avec', 'sans', 'sous', 'ce',
  'cet', 'cette', 'ces', 'son', 'sa', 'ses', 'leur', 'leurs', 'nos', 'vos',
  'notre', 'votre', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'il', 'elle',
  'ils', 'elles', 'on', 'nous', 'vous', 'je', 'tu', 'se', 'qui', 'que', 'quoi',
  'dont', 'où', 'est', 'sont', 'être', 'avoir', 'fait', 'faire', 'plus',
  'moins', 'très', 'bien', 'tout', 'tous', 'toute', 'toutes', 'cela', 'ceci',
  'comme', 'mais', 'donc', 'car', 'ne', 'pas', 'ni', 'si', 'aussi', 'entre',
  'leurs', 'lui', 'y', 'ses', 'the', 'and', 'for', 'with', 'this', 'that',
  'campagne', 'campagnes', 'marque', 'marques', 'publicité', 'publicite',
  'pub', 'vidéo', 'video', 'image', 'images', 'contenu', 'contenus', 'client',
  'clients', 'produit', 'produits', 'marketing', 'communication', 'projet',
  'cible', 'public', 'message', 'messages', 'idée', 'idee',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zàâäéèêëîïôöùûüçœ0-9\s-]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
}

function topN<T>(counts: Map<T, number>, n: number): T[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

function countValues(values: (string | null | undefined)[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const raw of values) {
    const v = (raw || '').trim()
    if (!v) continue
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  return counts
}

// --- Analyse des favoris -------------------------------------------------

export function extractInsights(campaigns: GeneratorCampaign[]): CampaignInsights {
  const keywordCounts = new Map<string, number>()
  for (const c of campaigns) {
    const blob = [c.title, c.summary, c.description, c.analyse, c.how_to_use]
      .map(stripHtml)
      .join(' ')
    for (const tag of c.tags || []) {
      if (tag) keywordCounts.set(tag.toLowerCase(), (keywordCounts.get(tag.toLowerCase()) || 0) + 2)
    }
    for (const word of tokenize(blob)) {
      keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1)
    }
  }

  const axes = campaigns.flatMap((c) => c.axe || [])
  const platforms = campaigns.flatMap((c) => c.platforms || [])
  const years = campaigns
    .map((c) => c.year)
    .filter((y): y is number => typeof y === 'number' && y > 0)

  return {
    campaignCount: campaigns.length,
    topKeywords: topN(keywordCounts, 12),
    topAxes: topN(countValues(axes), 5),
    topPlatforms: topN(countValues(platforms), 5),
    topFormats: topN(countValues(campaigns.map((c) => c.format)), 3),
    topCategories: topN(countValues(campaigns.map((c) => c.category)), 3),
    brandsReferenced: topN(countValues(campaigns.map((c) => c.brand)), 8),
    yearsRange: years.length
      ? Math.min(...years) === Math.max(...years)
        ? String(Math.min(...years))
        : `${Math.min(...years)}–${Math.max(...years)}`
      : null,
  }
}

// --- Référentiels de composition ----------------------------------------

const OBJECTIVES: Record<string, { angle: string; cta: string }> = {
  notoriete: { angle: 'faire connaître votre marque', cta: 'Découvrez {brand}' },
  conversion: { angle: "transformer l'intérêt en achat", cta: "J'en profite" },
  lancement: { angle: 'créer l’événement autour de votre lancement', cta: 'Soyez les premiers' },
  engagement: { angle: 'faire réagir et participer votre communauté', cta: 'Rejoignez le mouvement' },
  trafic: { angle: 'générer un maximum de visites', cta: 'Visitez {brand}' },
  fidelisation: { angle: 'renforcer le lien avec vos clients', cta: 'Entrez dans le cercle {brand}' },
}

const TONES: Record<string, { adj: string; style: string; palette: string }> = {
  inspirant: {
    adj: 'inspirante et porteuse de sens',
    style: 'photographie éditoriale lumineuse, grain fin, cadrage aéré',
    palette: 'tons chauds et lumineux, lumière dorée',
  },
  audacieux: {
    adj: 'audacieuse et percutante',
    style: 'rendu graphique contrasté, énergie visuelle forte, typographie massive',
    palette: 'couleurs vives et contrastées, aplats francs',
  },
  premium: {
    adj: 'élégante et premium',
    style: 'photographie haut de gamme, lumière douce, matières nobles, profondeur',
    palette: 'teintes profondes, noir, touches dorées',
  },
  proche: {
    adj: 'authentique et proche',
    style: 'photographie candid naturelle, scènes de vie réelle, lumière naturelle',
    palette: 'tons neutres et chaleureux',
  },
  ludique: {
    adj: 'ludique et joyeuse',
    style: 'illustration colorée et dynamique, formes rondes, mouvement',
    palette: 'palette pop et joyeuse, couleurs saturées',
  },
}

function channelFormat(channel: string): { ratio: string; note: string } {
  const c = channel.toLowerCase()
  if (c.includes('tiktok') || c.includes('reel') || c.includes('story') || c.includes('stories') || c.includes('short'))
    return { ratio: '9:16', note: 'format vertical plein écran 9:16, accroche dès la 1re seconde' }
  if (c.includes('youtube') || c.includes('tv') || c.includes('télé') || c.includes('tele'))
    return { ratio: '16:9', note: 'format paysage 16:9, narration de type spot' }
  if (c.includes('linkedin'))
    return { ratio: '1:1', note: 'format carré 1:1 ou 16:9, registre professionnel' }
  if (c.includes('affich') || c.includes('ooh') || c.includes('urbain') || c.includes('print'))
    return { ratio: '4:3', note: 'format affiche, lecture à distance, message ultra-court' }
  if (c.includes('insta') || c.includes('facebook') || c.includes('meta') || c.includes('feed'))
    return { ratio: '4:5', note: 'format vertical 4:5 (feed) et 9:16 (stories/reels)' }
  return { ratio: '1:1', note: 'format carré 1:1 par défaut, adaptable au canal' }
}

function pick<T>(arr: T[], i: number, fallback: T): T {
  return arr.length ? arr[i % arr.length] : fallback
}

// --- Composition du texte de campagne ------------------------------------

export function generateCampaign(
  campaigns: GeneratorCampaign[],
  brief: CampaignBrief,
): GeneratedCampaign {
  const insights = extractInsights(campaigns)

  const brand = (brief.brand || '').trim() || 'votre marque'
  const product = (brief.product || '').trim()
  const description = (brief.description || '').trim()
  const subject = product ? `${brand} — ${product}` : brand
  const audience = (brief.audience || '').trim()
  const tone = TONES[(brief.tone || '').toLowerCase()] || TONES.inspirant
  const objective = OBJECTIVES[(brief.objective || '').toLowerCase()] || OBJECTIVES.notoriete
  const channelRaw = (brief.channel || '').trim()
  const channel = channelRaw || (insights.topPlatforms[0] ?? 'réseaux sociaux')
  const fmt = channelFormat(channel)
  const cta = objective.cta.replace('{brand}', brand)

  const kw = insights.topKeywords
  const theme = pick(kw, 0, 'votre univers')
  const themes = kw.slice(0, 4).join(', ') || 'votre univers de marque'
  const audiencePart = audience ? ` auprès de ${audience}` : ''
  const themesPart = kw.length ? ` Thèmes dominants repérés : ${themes}.` : ''

  const accroches = [
    `${capitalize(theme)}, repensé par ${brand}.`,
    `Et si ${brand} faisait de « ${pick(kw, 1, theme)} » sa signature ?`,
    `${capitalize(pick(kw, 2, theme))} : la nouvelle promesse de ${brand}.`,
  ]

  const angles = [
    `${capitalize(pick(kw, 0, 'émotion'))} — capitalisez sur ce thème récurrent de vos références.`,
    `${capitalize(pick(kw, 3, 'preuve'))} — ancrez le message dans le concret.`,
    insights.topAxes.length
      ? `Levier « ${insights.topAxes[0]} » — l'axe qui revient le plus dans vos favoris.`
      : `Storytelling — racontez une histoire mémorable autour de ${brand}.`,
  ]

  const refLine = insights.brandsReferenced.length
    ? `Inspiré de ${insights.campaignCount} référence(s) que vous avez sauvegardées (${insights.brandsReferenced.slice(0, 4).join(', ')}${insights.brandsReferenced.length > 4 ? '…' : ''}).`
    : `Inspiré de ${insights.campaignCount} référence(s) que vous avez sauvegardées.`

  const formatsPart = insights.topFormats.length
    ? `Formats inspirés de vos favoris : ${insights.topFormats.join(', ')}.`
    : ''
  const platformsPart = insights.topPlatforms.length
    ? `Plateformes récurrentes dans vos références : ${insights.topPlatforms.join(', ')}.`
    : ''

  const campaignText = [
    `🎯 CONCEPT`,
    `${subject} — une campagne ${tone.adj} pour ${objective.angle}${audiencePart}.`,
    refLine + themesPart,
    ``,
    `✏️ ACCROCHES (3 pistes)`,
    ...accroches.map((a, i) => `${i + 1}. ${a}`),
    ``,
    `📝 MESSAGE CLÉ`,
    `${capitalize(subject)} prend la parole sur ${channel} avec un ton ${tone.adj}. ` +
      (description ? `${description} ` : '') +
      `On s'appuie sur ce qui fonctionne dans vos références — ${themes} — ` +
      `pour ${objective.angle}${audiencePart}.`,
    ``,
    `💡 ANGLES À EXPLOITER`,
    ...angles.map((a) => `• ${a}`),
    ``,
    `📣 CALL-TO-ACTION`,
    `${cta} →`,
    ``,
    `📡 PLAN DE DIFFUSION`,
    `Canal principal : ${channel} — ${fmt.note}.`,
    formatsPart,
    platformsPart,
  ]
    .filter((line) => line !== '')
    .join('\n')
    .replace(/\n(?=(✏️|📝|💡|📣|📡))/g, '\n\n')

  // --- Intention visuelle ---
  const audienceVis = audience || 'votre cible'
  const shortPrompt =
    `${brand}${product ? ' ' + product : ''}, ${theme}, ${tone.style.split(',')[0]}, ${tone.palette.split(',')[0]}, ${fmt.ratio}, professional ad campaign, high quality, sharp focus`

  const visualIntent = [
    `🎨 INTENTION VISUELLE`,
    `À coller dans votre générateur d'images (Midjourney, DALL·E, Firefly, Imagen…).`,
    ``,
    `Sujet : ${subject}, mis en scène pour ${audienceVis}, illustrant « ${theme} ».`,
    `Style : ${tone.style}.`,
    `Ambiance : ${tone.adj} — l'image doit servir à ${objective.angle}.`,
    `Composition : ${fmt.note}. Sujet central lisible, espace négatif pour intégrer le message et le logo.`,
    `Palette : ${tone.palette}.`,
    `Rendu : haute résolution, lumière soignée, profondeur de champ, sans texte incrusté.`,
    ``,
    `Prompt court (copier-coller) :`,
    shortPrompt,
  ].join('\n')

  return { insights, campaignText, visualIntent }
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
