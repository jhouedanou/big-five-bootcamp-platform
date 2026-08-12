/**
 * Extrait les visuels de l'étude BIG FIVE × LAVEIYE embarqués en base64 dans le
 * prototype HTML validé, et les écrit en WebP optimisé dans public/etudes/finance/.
 *
 * Le prototype pèse 1,6 Mo parce que les pages de l'étude y sont inlinées en
 * base64 — inutilisable tel quel sur mobile. Ce script est la trace de la
 * conversion : relancer si l'équipe fournit une nouvelle version du prototype.
 *
 *   node scripts/extract-etude-assets.mjs [chemin/vers/prototype.html]
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC =
  process.argv[2] ||
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'prototype_landing_page_bigfive_etude_laveiye.html')
const OUT = path.join(ROOT, 'public', 'etudes', 'finance')

/**
 * Index des <img> dans le prototype → nom de fichier.
 * L'index 0 est le logo Big Five, déjà présent dans public/ — on le saute.
 * Les index 1 et 2 sont la même couverture (mockup 3D + première vignette du
 * carrousel), d'où une seule sortie.
 */
const TARGETS = {
  1: 'couverture',
  3: 'preambule',
  4: 'sommaire',
  5: 'contenu-uba',
}

/** La plus grande zone d'affichage est le carrousel (~700px CSS) → 2x = 1400px. */
const MAX_WIDTH = 1400

const html = await fs.readFile(SRC, 'utf8')
const tags = html.match(/<img[^>]*>/g) || []
await fs.mkdir(OUT, { recursive: true })

const kb = (n) => `${Math.round(n / 1024)} Ko`
let failures = 0

for (const [index, name] of Object.entries(TARGETS)) {
  const match = tags[Number(index)]?.match(/src="data:image\/(\w+);base64,([^"]+)"/)
  if (!match) {
    console.error(`✗ ${name} : pas de source base64 à l'index ${index}`)
    failures++
    continue
  }

  const input = Buffer.from(match[2], 'base64')
  const meta = await sharp(input).metadata()
  const info = await sharp(input)
    .resize({ width: Math.min(MAX_WIDTH, meta.width ?? MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, `${name}.webp`))

  console.log(
    `✓ ${name}.webp — ${meta.width}×${meta.height} ${kb(input.length)} → ${info.width}×${info.height} ${kb(info.size)}`
  )
}

if (failures > 0) {
  console.error(`\n${failures} visuel(s) manquant(s) — la structure du prototype a peut-être changé.`)
  process.exit(1)
}
