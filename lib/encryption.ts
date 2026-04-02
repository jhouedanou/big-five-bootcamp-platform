import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * Récupère la clé de chiffrement depuis les variables d'environnement.
 * Doit être une chaîne de 64 caractères hexadécimaux (32 octets).
 * Si absente, utilise un fallback dérivé de SUPABASE_SERVICE_ROLE_KEY.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex')
  }
  // Fallback : dériver une clé à partir du service role key
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-fallback-key-for-dev'
  return crypto.createHash('sha256').update(fallback).digest()
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
  } catch {
    // Si le déchiffrement échoue, la valeur n'est probablement pas chiffrée
    return encryptedText
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
