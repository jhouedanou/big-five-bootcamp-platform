/**
 * Génération + helpers pour les codes promo du keynote LAVEIYE.
 * Format : LAVEIYE-XXXX (4 caractères alphanumériques sans ambiguïté)
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans 0/O/1/I/L

export function generatePromoCode(prefix = 'LAVEIYE'): string {
  let code = ''
  // Utilise crypto.getRandomValues si dispo (Node 20+)
  const bytes = new Uint8Array(4)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return `${prefix}-${code}`
}
