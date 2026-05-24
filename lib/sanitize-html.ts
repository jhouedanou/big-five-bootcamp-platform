/**
 * Sanitizer HTML pour les contenus rendus via `dangerouslySetInnerHTML`.
 *
 * S'appuie sur DOMPurify (via `isomorphic-dompurify`, qui utilise le DOM natif
 * côté navigateur et jsdom côté serveur). DOMPurify couvre les vecteurs que la
 * version précédente à base de regex laissait passer (balises malformées,
 * mutation-XSS, encodages, etc.).
 *
 * À utiliser sur tout HTML d'origine admin avant rendu côté client.
 */

import DOMPurify from 'isomorphic-dompurify'

// Schémas d'URL autorisés : http(s), mailto, tel, chemins relatifs, et images
// inline en data: (formats raster uniquement — pas de SVG, qui peut porter du
// script). Tout le reste (javascript:, vbscript:, data:text/html…) est rejeté.
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel):|data:image\/(?:png|jpe?g|gif|webp);base64,|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i

/**
 * Nettoie un HTML potentiellement hostile et renvoie une chaîne sûre à
 * injecter via `dangerouslySetInnerHTML`. L'entrée non-string est convertie
 * en chaîne vide pour éviter `[object Object]` ou exceptions.
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string' || !input) return ''

  return DOMPurify.sanitize(input, {
    // En plus de la liste interdite par défaut de DOMPurify (script, etc.),
    // on bloque explicitement les tags porteurs de risques additionnels.
    FORBID_TAGS: ['style', 'svg', 'math', 'form', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style'],
    ALLOWED_URI_REGEXP,
  })
}
