/**
 * Télécharge les logos officiels des opérateurs Mobile Money depuis Wikimedia
 * Commons vers `public/operators/`.
 *
 * Utilise l'API Wikimedia (action=query&prop=imageinfo) pour résoudre
 * dynamiquement l'URL réelle du fichier — évite les liens cassés quand
 * Wikimedia régénère les hash de chemin.
 *
 * Usage :
 *   node scripts/download-operator-logos.mjs
 */

import { mkdirSync, createWriteStream, existsSync, statSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { pipeline } from "node:stream/promises"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = resolve(__dirname, "..", "public", "operators")

/**
 * Liste des fichiers Wikimedia Commons à télécharger.
 * `commonsFile` = nom exact du fichier sur https://commons.wikimedia.org/wiki/File:<nom>
 */
const LOGOS = [
  { dest: "mtn.svg",    commonsFile: "MTN_Logo.svg" },
  { dest: "orange.svg", commonsFile: "Orange_logo.svg" },
  { dest: "moov.png",   commonsFile: "Moov_Africa_logo.png" },
  { dest: "wave.svg",   commonsFile: "Wave_Logo.svg" },
  { dest: "free.svg",   commonsFile: "Free_logo.svg" },
]

const USER_AGENT =
  "BigFiveBootcampPlatform/1.0 (admin@bigfive.solutions)"

async function resolveCommonsUrl(commonsFile) {
  const apiUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: `File:${commonsFile}`,
      prop: "imageinfo",
      iiprop: "url",
      format: "json",
    }).toString()

  const res = await fetch(apiUrl, { headers: { "User-Agent": USER_AGENT } })
  if (!res.ok) throw new Error(`API HTTP ${res.status}`)
  const data = await res.json()
  const pages = data?.query?.pages
  if (!pages) throw new Error("Réponse API vide")
  const page = Object.values(pages)[0]
  if (!page || page.missing !== undefined) {
    throw new Error(`File:${commonsFile} introuvable sur Commons`)
  }
  const url = page?.imageinfo?.[0]?.url
  if (!url) throw new Error(`Pas d'URL pour ${commonsFile}`)
  return url
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`)
  if (!res.body) throw new Error(`Pas de corps de réponse pour ${url}`)
  await pipeline(res.body, createWriteStream(dest))
  const size = statSync(dest).size
  if (size < 200) throw new Error(`Fichier suspect (${size} octets)`)
  return size
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  let ok = 0
  let failed = 0

  for (const logo of LOGOS) {
    const dest = resolve(OUTPUT_DIR, logo.dest)
    try {
      console.log(`→ ${logo.dest} (Commons: ${logo.commonsFile})`)
      const url = await resolveCommonsUrl(logo.commonsFile)
      const size = await download(url, dest)
      console.log(`  ✓ ${size} octets — ${url}`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${err.message}`)
      failed++
    }
  }

  console.log(`\nTerminé — ${ok} ok, ${failed} échec(s).`)
  if (failed > 0) {
    console.log(
      "\nPour les échecs : télécharge manuellement le SVG/PNG depuis le site " +
        "officiel ou Wikimedia, place-le dans public/operators/ avec le nom attendu."
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
