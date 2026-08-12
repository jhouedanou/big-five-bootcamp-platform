import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption'

/**
 * Identifiants des intégrations (tracking, IA), configurables depuis
 * /admin/integrations plutôt que par variables d'environnement.
 *
 * Répond au brief trackers, qui liste ces identifiants comme « à renseigner »,
 * et surtout à un besoin concret : faire tourner un jeton compromis ne doit pas
 * demander un déploiement. Même stockage que Mailchimp et Chariow — table
 * `site_settings`, secrets chiffrés en AES-256-GCM (lib/encryption.ts).
 *
 * Ordre de résolution : valeur en base d'abord, variable d'environnement en
 * repli. La production continue donc de fonctionner tant que rien n'est saisi.
 */

export interface IntegrationField {
  key: string
  label: string
  help: string
  /** Chiffré en base et jamais renvoyé en clair au navigateur. */
  secret: boolean
  /** Variable d'environnement servant de repli. */
  envVar: string
  group: 'tracking' | 'ia'
  placeholder?: string
  /** Présent = choix fermé, rendu en liste déroulante côté admin. */
  options?: Array<{ value: string; label: string }>
}

export const INTEGRATION_FIELDS: IntegrationField[] = [
  {
    key: 'ga4_measurement_id',
    label: 'Google Analytics — identifiant de mesure',
    help: 'Commence par G-. Visible dans Analytics › Admin › Flux de données.',
    secret: false,
    envVar: 'NEXT_PUBLIC_GA_ID',
    group: 'tracking',
    placeholder: 'G-XXXXXXXXXX',
  },
  {
    key: 'ga4_api_secret',
    label: 'Google Analytics — secret d’API',
    help:
      'Permet d’envoyer les conversions depuis le serveur, sans être bloqué par les bloqueurs de publicité. Analytics › Admin › Flux de données › Secrets de l’API Measurement Protocol.',
    secret: true,
    envVar: 'GA4_API_SECRET',
    group: 'tracking',
  },
  {
    key: 'meta_pixel_id',
    label: 'Meta — identifiant du pixel',
    help: 'Suite de chiffres, visible dans Meta Events Manager.',
    secret: false,
    envVar: 'NEXT_PUBLIC_FB_PIXEL_ID',
    group: 'tracking',
    placeholder: '1889630218258683',
  },
  {
    key: 'meta_capi_token',
    label: 'Meta — jeton Conversions API',
    help:
      'Envoie les conversions depuis le serveur. À régénérer dans Meta Business Manager si le jeton a circulé ; le remplacer ici suffit, aucun déploiement nécessaire.',
    secret: true,
    envVar: 'FB_CAPI_ACCESS_TOKEN',
    group: 'tracking',
  },
  {
    key: 'groq_api_key',
    label: 'Groq — clé d’API',
    help: 'Analyse des textes et des visuels de référence. console.groq.com.',
    secret: true,
    envVar: 'GROQ_API_KEY',
    group: 'ia',
  },
  {
    key: 'image_model',
    label: 'Génération d’images — modèle',
    help:
      'Moteur utilisé par le studio publicitaire. « Automatique » : FLUX.2 Klein (Cloudflare) si le compte est configuré, sinon le service gratuit intégré ; en cas d’échec, la chaîne passe au moteur suivant. Les modèles Leonardo sont des modèles partenaires facturés à l’usage par Cloudflare (≈ 3 à 7 centimes l’image), Klein ≈ 0,3 centime.',
    secret: false,
    envVar: 'STUDIO_IMAGE_MODEL',
    group: 'ia',
    options: [
      { value: '', label: 'Automatique (recommandé)' },
      { value: 'cf:flux-2-klein-4b', label: 'FLUX.2 Klein 4B — Cloudflare (rapide, économique)' },
      { value: 'cf:phoenix-1.0', label: 'Leonardo Phoenix — Cloudflare (qualité, texte soigné)' },
      { value: 'cf:lucid-origin', label: 'Leonardo Lucid Origin — Cloudflare (qualité, direction artistique)' },
      { value: 'cf:flux-1-schnell', label: 'FLUX.1 Schnell — Cloudflare (économique, carré uniquement)' },
      { value: 'pollinations', label: 'Service gratuit intégré (communautaire)' },
      { value: 'gemini', label: 'Google Gemini (nécessite clé + facturation)' },
    ],
  },
  {
    key: 'cloudflare_account_id',
    label: 'Cloudflare — identifiant de compte',
    help:
      'Pour la génération d’images via Workers AI (quota quotidien gratuit, sans carte bancaire). Tableau de bord Cloudflare › Workers & Pages : l’« Account ID » est dans la colonne de droite.',
    secret: false,
    envVar: 'CLOUDFLARE_ACCOUNT_ID',
    group: 'ia',
    placeholder: '32 caractères hexadécimaux',
  },
  {
    key: 'cloudflare_api_token',
    label: 'Cloudflare — jeton d’API',
    help:
      'Créez-le dans Mon profil › Jetons d’API › Créer un jeton, avec le modèle « Workers AI » (lecture/édition). Les deux champs Cloudflare doivent être remplis pour activer ce fournisseur.',
    secret: true,
    envVar: 'CLOUDFLARE_API_TOKEN',
    group: 'ia',
  },
  {
    key: 'gemini_api_key',
    label: 'Google Gemini — clé d’API (optionnelle)',
    help:
      'Génération des visuels publicitaires en qualité supérieure, avec prise en compte directe de l’image de référence. Nécessite la facturation Google activée — sans elle, ce modèle refuse dès la première requête. Laissez vide pour utiliser le service gratuit intégré (FLUX), qui fonctionne sans compte.',
    secret: true,
    envVar: 'GEMINI_API_KEY',
    group: 'ia',
  },
]

const FIELD_BY_KEY = new Map(INTEGRATION_FIELDS.map((f) => [f.key, f]))

/** Cache court : ces valeurs sont lues à chaque événement de tracking. */
let cache: { values: Map<string, string>; expiresAt: number } | null = null
const CACHE_TTL_MS = 30_000

async function loadFromDb(): Promise<Map<string, string>> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.values

  const values = new Map<string, string>()
  try {
    const { data } = await getSupabaseAdmin()
      .from('site_settings')
      .select('key, value')
      .in(
        'key',
        INTEGRATION_FIELDS.map((f) => f.key)
      )

    for (const row of (data as any[]) || []) {
      if (!row?.value) continue
      const field = FIELD_BY_KEY.get(row.key)
      // Un secret est stocké chiffré ; on tolère une valeur en clair pour ne pas
      // casser une saisie faite avant la mise en place du chiffrement.
      const value =
        field?.secret && isEncrypted(row.value) ? decrypt(row.value) : row.value
      if (value) values.set(row.key, value)
    }
  } catch (error: any) {
    // site_settings injoignable : on retombe sur l'environnement.
    console.error('Lecture site_settings (intégrations) échouée:', error?.message || error)
  }

  cache = { values, expiresAt: now + CACHE_TTL_MS }
  return values
}

/** Invalide le cache après une écriture, pour que la nouvelle valeur prenne tout de suite. */
export function invalidateIntegrationCache(): void {
  cache = null
}

/**
 * Valeur effective d'un identifiant : base d'abord, variable d'environnement
 * ensuite. Retourne '' si ni l'une ni l'autre n'est renseignée.
 */
export async function getIntegrationValue(key: string): Promise<string> {
  const field = FIELD_BY_KEY.get(key)
  if (!field) return ''
  const values = await loadFromDb()
  return values.get(key) || process.env[field.envVar] || ''
}

/** Plusieurs valeurs en une lecture. */
export async function getIntegrationValues(
  keys: string[]
): Promise<Record<string, string>> {
  const values = await loadFromDb()
  const out: Record<string, string> = {}
  for (const key of keys) {
    const field = FIELD_BY_KEY.get(key)
    out[key] = values.get(key) || (field ? process.env[field.envVar] || '' : '')
  }
  return out
}

/**
 * Masque une valeur pour l'affichage : seuls les quatre derniers caractères
 * restent lisibles, assez pour vérifier qu'on a bien la bonne clé sans jamais
 * renvoyer le secret au navigateur.
 */
export function maskValue(value: string): string {
  if (!value) return ''
  if (value.length <= 4) return '••••'
  return `••••••••${value.slice(-4)}`
}

export interface IntegrationStatus {
  key: string
  /** Valeur en clair pour les champs non secrets, masquée pour les secrets. */
  display: string
  configured: boolean
  /** true si la valeur vient d'une variable d'environnement et non de la base. */
  fromEnv: boolean
}

/** État de tous les champs, sans jamais exposer un secret en clair. */
export async function getIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const values = await loadFromDb()

  return INTEGRATION_FIELDS.map((field) => {
    const dbValue = values.get(field.key) || ''
    const envValue = process.env[field.envVar] || ''
    const effective = dbValue || envValue

    return {
      key: field.key,
      display: field.secret ? maskValue(effective) : effective,
      configured: !!effective,
      fromEnv: !dbValue && !!envValue,
    }
  })
}

/**
 * Enregistre les valeurs saisies. Une chaîne vide efface la valeur en base
 * (l'éventuelle variable d'environnement reprend alors la main).
 */
export async function saveIntegrationValues(
  input: Record<string, string>
): Promise<{ saved: string[]; error?: string }> {
  const rows: Array<{ key: string; value: string }> = []

  for (const [key, raw] of Object.entries(input)) {
    const field = FIELD_BY_KEY.get(key)
    if (!field) continue

    const value = String(raw ?? '').trim()
    rows.push({
      key,
      value: value && field.secret ? encrypt(value) : value,
    })
  }

  if (rows.length === 0) return { saved: [] }

  const { error } = await getSupabaseAdmin()
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) {
    console.error('Enregistrement intégrations échoué:', error.message)
    return { saved: [], error: error.message }
  }

  invalidateIntegrationCache()
  return { saved: rows.map((r) => r.key) }
}
