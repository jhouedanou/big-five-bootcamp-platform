/**
 * Parsing léger d'un User-Agent → libellé lisible pour l'utilisateur.
 *
 * Volontairement minimaliste : on ne charge pas une lib type `ua-parser-js`
 * pour quelques dizaines de cas attendus (Chrome, Safari, Firefox, Edge,
 * mobile iOS/Android). Étendre `BROWSERS` / `OSES` au besoin.
 */

interface ParsedUA {
  browser: string
  os: string
  isMobile: boolean
}

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/Firefox\/(\d+)/, 'Firefox'],
  [/Chrome\/(\d+)/, 'Chrome'],
  [/Safari\/(\d+)/, 'Safari'],
]

const OSES: Array<[RegExp, string]> = [
  [/Windows NT 10/, 'Windows 10/11'],
  [/Windows NT/, 'Windows'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
]

function matchFirst(ua: string, table: Array<[RegExp, string]>): string {
  for (const [re, label] of table) {
    if (re.test(ua)) return label
  }
  return 'Inconnu'
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { browser: 'Navigateur inconnu', os: 'Système inconnu', isMobile: false }
  return {
    browser: matchFirst(ua, BROWSERS),
    os: matchFirst(ua, OSES),
    isMobile: /Mobi|Android|iPhone|iPad|iPod/i.test(ua),
  }
}

export function formatDeviceLabel(ua: string | null | undefined): string {
  const { browser, os, isMobile } = parseUserAgent(ua)
  const kind = isMobile ? 'Mobile' : 'Ordinateur'
  return `${browser} · ${os} (${kind})`
}
