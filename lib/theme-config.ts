/**
 * Feature flag thème (LOT D) : mode sombre temporairement désactivé.
 *
 * `false` → tout le site est servi en mode clair :
 *  - le thème est forcé à "light" (next-themes `forcedTheme`), ce qui ignore
 *    aussi les préférences "dark" déjà stockées (localStorage / système) ;
 *  - le toggle de thème est masqué partout (ThemeToggle rend null).
 *
 * Réactivation : repasser à `true` — aucun code de thème n'a été supprimé.
 */
export const DARK_MODE_ENABLED = false
