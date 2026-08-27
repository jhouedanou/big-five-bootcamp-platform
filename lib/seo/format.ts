/**
 * Écrêtage des balises title et description.
 *
 * Aucun accès base, aucune dépendance : testable isolément et utilisable
 * depuis n'importe quel runtime.
 *
 * Les seuils sont des repères de troncature, pas des règles de Google :
 * l'affichage réel dépend de la largeur en pixels et de la requête.
 */

export const BRAND = "Laveiye"

/** Repère de troncature du `<title>` dans les résultats. */
export const TITLE_MAX = 60

/** Repère de troncature de la `<meta name="description">`. */
export const DESCRIPTION_MAX = 155

function tidy(raw: string): string {
  return raw.replace(/\s+/g, " ").trim()
}

/**
 * Coupe sur une frontière de mot quand c'est possible.
 *
 * On ne recule jusqu'à l'espace précédent que s'il ne massacre pas la phrase
 * (au-delà de 60 % de la limite) : sur un mot très long, mieux vaut couper
 * au caractère que de perdre la moitié de la balise.
 */
export function clip(text: string, max: number): string {
  const base = tidy(text)
  if (base.length <= max) return base

  const cut = base.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  const head = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut

  return `${head.replace(/[\s.,;:!?–—-]+$/, "")}…`
}

/**
 * Compose « Titre | Laveiye » en 60 caractères maximum.
 *
 * On écrête le titre, jamais la marque : c'est le seul élément qui rend le
 * résultat identifiable dans la SERP, il doit survivre à la coupe. Couper
 * soi-même plutôt que laisser Google le faire, c'est choisir ce qui reste.
 */
export function clampTitle(raw: string, max = TITLE_MAX, brand = BRAND): string {
  const suffix = ` | ${brand}`
  const base = tidy(raw)
  if (!base) return brand
  return `${clip(base, max - suffix.length)}${suffix}`
}

export function clampDescription(raw: string, max = DESCRIPTION_MAX): string {
  return clip(raw, max)
}
