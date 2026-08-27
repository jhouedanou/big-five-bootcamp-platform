import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

let warnedFallback = false

/**
 * Récupère la clé de chiffrement depuis les variables d'environnement.
 *
 * `ENCRYPTION_KEY` (64 caractères hex) est la seule source valable en
 * production. Le repli historique — dériver `sha256(SUPABASE_SECRET_KEY)` — est
 * désormais réservé au développement : depuis la migration vers les clés API
 * `sb_secret_...` (2026-08-26), la clé secrète Supabase est rotable
 * indépendamment, et une rotation changerait silencieusement la clé de
 * chiffrement. Les secrets déjà en base (mailchimp_api_key, meta_capi_token,
 * ga4_api_secret, cloudflare_api_token) deviendraient alors illisibles, sans
 * aucune erreur visible : `decrypt()` renvoie '' en cas d'échec.
 *
 * On échoue donc explicitement en production plutôt que de chiffrer avec une
 * clé fantôme. Le coût est un 500 sur `/api/admin/settings` en cas de
 * mauvaise configuration — c'est le comportement recherché : une écriture avec
 * la mauvaise clé est irréversible, un 500 ne l'est pas.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (envKey && envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, 'hex')
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY (64 caractères hex) est requise en production. Le repli dérivé de SUPABASE_SECRET_KEY a été retiré : une rotation de la clé secrète Supabase rendrait illisibles les secrets déjà chiffrés dans site_settings.'
    )
  }

  const serviceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!serviceKey) {
    throw new Error(
      'Aucune clé de chiffrement disponible : ENCRYPTION_KEY (64 hex) ou SUPABASE_SECRET_KEY doit être configurée.'
    )
  }

  if (!warnedFallback) {
    warnedFallback = true
    console.warn(
      '[encryption] ENCRYPTION_KEY absente ou invalide — repli dérivé de SUPABASE_SECRET_KEY (développement uniquement). Les secrets chiffrés avec la clé de production ne seront pas déchiffrables.'
    )
  }

  return crypto.createHash('sha256').update(serviceKey).digest()
}

/**
 * Chiffre une chaîne de caractères avec AES-256-GCM.
 * Retourne une chaîne au format : iv:encrypted:tag (en hex)
 */
export function encrypt(text: string): string {
  if (!text) return ''
  
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM.
 * Attend le format : iv:encrypted:tag (en hex)
 *
 * Retourne `''` en cas d'échec (au lieu de renvoyer le ciphertext, ce qui
 * trompait les appelants : ils croyaient avoir une vraie valeur déchiffrée).
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''

  const parts = encryptedText.split(':')
  if (parts.length !== 3) return encryptedText // Pas chiffré, retourner tel quel

  try {
    const key = getEncryptionKey()
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const tag = Buffer.from(parts[2], 'hex')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (err) {
    // Le déchiffrement a échoué : clé manquante/changée, données corrompues,
    // etc. On NE renvoie PAS le ciphertext (cf. anciens bugs où un appelant
    // utilisait le ciphertext comme s'il s'agissait de la vraie valeur).
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[encryption] decrypt() failed:', (err as Error)?.message)
    }
    return ''
  }
}

/**
 * Vérifie si une chaîne semble être chiffrée (format iv:data:tag)
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false
  const parts = text.split(':')
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2 && parts[2].length === TAG_LENGTH * 2
}
