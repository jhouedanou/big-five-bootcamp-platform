import { fixBrokenEncoding } from "@/lib/utils"
import {
  BRAND,
  DESCRIPTION_MAX,
  TITLE_MAX,
  clampDescription,
  clampTitle,
  clip,
} from "@/lib/seo/format"

/**
 * Composition des balises d'une fiche campagne (`/content/[slug]`).
 *
 * Ce gabarit porte l'essentiel du volume indexable du site (807 URL au
 * 27 août 2026), donc chaque défaut y est multiplié par plusieurs centaines.
 *
 * Deux pièges de schéma à connaître avant de toucher à ce fichier :
 *   - le secteur s'appelle `category` en base (`sector` n'existe que dans l'UI)
 *   - il n'y a PAS de colonne `objective` ni `platform` : l'objectif est noyé
 *     dans `tags`, la plateforme est `platforms` (text[]).
 */

/** Séparateur entre le titre de campagne et la marque. */
const SEPARATOR = " · "

/** En deçà, le titre écrêté ne veut plus rien dire : on préfère tout couper. */
const MIN_TITLE_CHARS = 16

/** Phrase de clôture — informative, et surtout jamais coupée à mi-mot. */
const CLOSING = "Visuels et lecture stratégique dans la bibliothèque Laveiye."

/** Normalisation des noms de pays — reprise de app/dashboard/page.tsx. */
const COUNTRY_ALIASES: Record<string, string> = {
  "cote d'ivoire": "Côte d'Ivoire",
  "côte d'ivoire": "Côte d'Ivoire",
  senegal: "Sénégal",
  sénégal: "Sénégal",
  benin: "Bénin",
  bénin: "Bénin",
  guinee: "Guinée",
  guinée: "Guinée",
  "guinee-bissau": "Guinée-Bissau",
  "guinée-bissau": "Guinée-Bissau",
  mali: "Mali",
  niger: "Niger",
  togo: "Togo",
  "burkina faso": "Burkina Faso",
  cameroun: "Cameroun",
  cameroon: "Cameroun",
}

export function normalizeCountry(raw: string | null | undefined): string {
  if (!raw) return ""
  const trimmed = raw.trim()
  const degarbled = trimmed.replace(/C\uFFFDte d['\u2019]Ivoire/i, "C\u00f4te d'Ivoire")
  return COUNTRY_ALIASES[degarbled.toLowerCase()] ?? degarbled
}

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&(#39|rsquo|lsquo);/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

type CampaignLike = Record<string, any>

const text = (value: unknown): string =>
  typeof value === "string" ? fixBrokenEncoding(value).trim() : ""

/**
 * Titre de la fiche : « Titre · Marque | Laveiye », écrêté à 60.
 *
 * La marque entre dans le titre parce que c'est ce que les gens tapent
 * (« publicité Orange Côte d'Ivoire »), pas le nom interne de la campagne.
 * Elle départage aussi des fiches dont le titre en base se réduit souvent au
 * nom de la marque seule — d'où des centaines de titres identiques.
 */
export function buildCampaignTitle(campaign: CampaignLike): string {
  const title = text(campaign.title) || "Campagne publicitaire"
  const brand = text(campaign.brand)
  const country = normalizeCountry(campaign.country)

  // Titre déjà réduit au nom de la marque : le pays est ce qui différencie.
  if (brand && title.toLowerCase() === brand.toLowerCase()) {
    return clampTitle([brand, country].filter(Boolean).join(SEPARATOR))
  }

  if (!brand) return clampTitle(title)

  // Sur un titre long, c'est le titre qu'on écrête, pas la marque : « Le grand
  // jeu de la rentrée scolaire… · NSIA Banque » vaut mieux que « … · NSIA… ».
  // On n'y renonce que si la marque seule mange déjà tout le budget.
  const budget = TITLE_MAX - ` | ${BRAND}`.length - SEPARATOR.length - brand.length
  if (budget >= MIN_TITLE_CHARS) {
    return clampTitle(`${clip(title, budget)}${SEPARATOR}${brand}`)
  }

  return clampTitle(`${title}${SEPARATOR}${brand}`)
}

/**
 * Description : l'éditorial quand il existe, sinon une phrase construite à
 * partir des champs du produit.
 *
 * Le repli n'est jamais vide et n'est jamais la même phrase d'une fiche à
 * l'autre : l'ancien `{marque} - {catégorie} | Découvrez cette campagne
 * créative` était dupliqué à l'identique sur des centaines d'URL.
 */
export function buildCampaignDescription(campaign: CampaignLike): string {
  const editorial = stripHtml(text(campaign.description) || text(campaign.summary))
  if (editorial.length >= 80) return clampDescription(editorial)

  const brand = text(campaign.brand)
  const country = normalizeCountry(campaign.country)
  const sector = text(campaign.category)
  const format = text(campaign.format)
  const platform = Array.isArray(campaign.platforms) ? text(campaign.platforms[0]) : ""
  const year = campaign.year ? String(campaign.year) : ""

  const subject = brand
    ? `Campagne ${brand}${country ? ` en ${country}` : ""}`
    : `Campagne publicitaire${country ? ` en ${country}` : " en Afrique francophone"}`

  // Du plus au moins utile en recherche : on sacrifie la fin, pas le début.
  const details = [
    sector && `secteur ${sector}`,
    format && `format ${format.toLowerCase()}`,
    platform && `sur ${platform}`,
    year && `diffusée en ${year}`,
  ].filter(Boolean) as string[]

  // On retire des détails tant que la phrase de clôture ne tient pas entière.
  // Couper « …dans la bibliothèque… » ferait perdre l'argument de clic pour
  // gagner trois mots de description factuelle : le change est mauvais.
  for (let keep = details.length; keep >= 0; keep--) {
    const sentence = `${[subject, ...details.slice(0, keep)].join(", ")}. ${CLOSING}`
    if (sentence.length <= DESCRIPTION_MAX) return sentence
  }

  return clampDescription(`${subject}. ${CLOSING}`)
}
