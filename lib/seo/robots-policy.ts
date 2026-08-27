/**
 * Source unique des chemins interdits d'indexation.
 *
 * Consommée par `middleware.ts` (en-tête `X-Robots-Tag`) ET par
 * `app/sitemap.ts` (filtre de sortie). Une route ajoutée ici disparaît
 * automatiquement du sitemap : la contradiction « URL déclarée à Google
 * ET interdite d'indexation » devient structurellement impossible.
 *
 * Au 27 août 2026, 5 des 12 URL du sitemap étaient dans ce cas — dont
 * `/library`, deuxième priorité du site (0.95) alors qu'elle redirige vers
 * `/dashboard` et porte un `noindex`.
 *
 * AUCUN IMPORT dans ce fichier : il s'exécute sur le runtime edge du
 * middleware autant que côté Node dans le sitemap.
 */

/** Chemins exacts. Les enfants éventuels ne sont pas couverts. */
export const NOINDEX_EXACT: readonly string[] = [
  '/maintenance',
  '/library',
  '/community',
  '/demo',
  '/keynote', // événement passé du 21 mai 2026, titre périmé
]

/** Préfixes : le chemin lui-même et tous ses enfants. */
export const NOINDEX_PREFIXES: readonly string[] = [
  '/admin',
  '/onboarding',
  '/dashboard',
  '/favorites',
  '/profile',
  '/settings',
  '/subscribe',
  '/pay',
  '/payment',
  '/paywall',
  '/studio-pub',
  '/campaign-generator',
  '/notifications',
  '/temps-forts', // le détail est derrière SubscriptionGuard
  '/login',
  '/register',
  '/forgot-password',
  '/update-password',
  '/auth',
  // Ajouts : routes publiques qui étaient indexables par omission.
  '/checkout', // tunnel de paiement
  '/shared', // /shared/[token] — liens de partage privés
  '/account-deletion',
  '/webinaires', // /webinaires/[slug]/preview est réservé aux abonnés
  // Revenu ici après tentative d'ouverture : la page redirige les anonymes
  // vers /login et affiche « Plan Pro requis » aux non-Pro. Google verrait
  // une coquille paywallée sous un beau titre. À rouvrir le jour où une
  // vitrine publique existera — les balises de app/decrypte/layout.tsx
  // sont prêtes et attendent ce moment.
  '/decrypte',
]

/**
 * Le préfixe est comparé sur une frontière de segment, pas par un
 * `startsWith` nu : sans cela `/pay` capturerait `/paywall`, et les futures
 * routes `/campagnes` et `/marques` risqueraient d'être happées par erreur.
 */
export function isNoIndexPath(pathname: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (NOINDEX_EXACT.includes(path)) return true

  return NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}
