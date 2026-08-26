/**
 * API Route: GET /api/cron/media-health
 *
 * Contrôle préventif quotidien des visuels de campagne (brief médias §11).
 *
 * L'objectif est de ne plus découvrir un visuel cassé en consultant le
 * front-office. Le cas à attraper n'est pas une erreur HTTP : quand un fichier
 * Google Drive est supprimé, Google répond `HTTP 200` avec sa page de
 * connexion. La sonde vérifie donc les octets reçus, pas le code de statut.
 *
 * Priorités de passage, dans cet ordre :
 *   1. les visuels jamais contrôlés ;
 *   2. les visuels encore servis par une source externe — ceux qui peuvent
 *      tomber sans prévenir ;
 *   3. les visuels déjà cassés, au cas où la source reviendrait ;
 *   4. un échantillon tournant de visuels sécurisés, pour vérifier notre propre
 *      stockage.
 *
 * Sécurité : protégé par CRON_SECRET, comme les autres crons du projet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { probeImageUrl, inChunks } from '@/lib/media-validate-server'
import { classifyMediaHosting, type MediaState } from '@/lib/media-validation'
import { normalizeImageBuffer } from '@/lib/image-server'
import { IMAGE_PRESETS, NORMALIZED_SUFFIXES, normalizedSuffix } from '@/lib/image-presets'
import { ensureBucket, AVATAR_BUCKET, AD_STUDIO_BUCKET, DOCUMENTS_BUCKET } from '@/lib/storage-buckets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/** Sonde + normalisation de neuf cibles : le défaut Vercel ne suffit pas. */
export const maxDuration = 300

/** Borne de passage : le cron doit tenir dans la durée d'une fonction. */
const MAX_PER_RUN = 120
/** Part du passage réservée au re-contrôle de notre propre stockage. */
const SECURED_SAMPLE = 20
/** Visuels surdimensionnés normalisés par passage, toutes cibles confondues. */
const RESIZE_PER_RUN = 25

/**
 * Colonnes contenant une URL de visuel, avec la largeur attendue pour leur
 * usage. La sonde de santé ne concerne que `campaigns` (seule table portant
 * `media_status`) ; la normalisation, elle, s'applique à tout.
 *
 * `campaigns.images` et `studies.slides` sont absents : ce sont des colonnes
 * tableau, non filtrables en SQL. Ils relèvent du script de rattrapage
 * `scripts/normalize-existing-media.ts`.
 */
const NORMALIZE_TARGETS = [
  { key: 'campaigns.thumbnail', table: 'campaigns', column: 'thumbnail', width: IMAGE_PRESETS.campaignThumb },
  { key: 'dashboard_banners.image_url', table: 'dashboard_banners', column: 'image_url', width: IMAGE_PRESETS.banner },
  { key: 'temps_forts.image_url', table: 'temps_forts', column: 'image_url', width: IMAGE_PRESETS.tempsFort },
  { key: 'temps_forts.hero_image_url', table: 'temps_forts', column: 'hero_image_url', width: IMAGE_PRESETS.tempsFortHero },
  { key: 'studies.cover_url', table: 'studies', column: 'cover_url', width: IMAGE_PRESETS.studyCover },
] as const

interface Row {
  id: string
  slug: string | null
  thumbnail: string | null
  media_status: MediaState | null
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('[cron/media-health] CRON_SECRET non configuré')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (!url || !key) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }
    const db = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const select = 'id, slug, thumbnail, media_status'
    const picked: Row[] = []
    const seen = new Set<string>()

    const take = (rows: Row[] | null) => {
      for (const r of rows ?? []) {
        if (picked.length >= MAX_PER_RUN) return
        if (seen.has(r.id)) continue
        seen.add(r.id)
        picked.push(r)
      }
    }

    // 1 à 3 : ce qui est à risque ou déjà en défaut.
    const { data: unchecked } = await db
      .from('campaigns').select(select).is('media_status', null).limit(MAX_PER_RUN)
    take(unchecked as Row[] | null)

    const { data: external } = await db
      .from('campaigns').select(select).eq('media_status', 'external')
      .order('media_checked_at', { ascending: true, nullsFirst: true })
      .limit(MAX_PER_RUN)
    take(external as Row[] | null)

    const { data: broken } = await db
      .from('campaigns').select(select).eq('media_status', 'broken')
      .order('media_checked_at', { ascending: true, nullsFirst: true })
      .limit(MAX_PER_RUN)
    take(broken as Row[] | null)

    // 4 : échantillon tournant du stockage LAVEIYE — les plus anciennement
    //     contrôlés d'abord, pour que tout finisse par repasser.
    if (picked.length < MAX_PER_RUN) {
      const { data: secured } = await db
        .from('campaigns').select(select).eq('media_status', 'secured')
        .order('media_checked_at', { ascending: true, nullsFirst: true })
        .limit(Math.min(SECURED_SAMPLE, MAX_PER_RUN - picked.length))
      take(secured as Row[] | null)
    }

    const checkedAt = new Date().toISOString()
    const origin = url
    const newlyBroken: Array<{ slug: string | null; reason: string | null }> = []
    let stillOk = 0

    await inChunks(picked, 6, async (c) => {
      const hosting = classifyMediaHosting(c.thumbnail, origin)
      let state: MediaState = hosting
      let reason: string | null = null

      if (hosting !== 'empty') {
        const probe = await probeImageUrl(c.thumbnail as string)
        if (!probe.ok) {
          state = 'broken'
          reason = probe.reason
        }
      }

      // On ne signale que les bascules : un visuel déjà connu comme cassé
      // n'est pas une nouvelle, et noyer l'alerte la rend inutile.
      if (state === 'broken' && c.media_status !== 'broken') {
        newlyBroken.push({ slug: c.slug, reason })
      } else if (state !== 'broken') {
        stillOk++
      }

      await db
        .from('campaigns')
        .update({ media_status: state, media_checked_at: checkedAt, media_reason: reason })
        .eq('id', c.id)
    })

    // ── Normalisation différée ───────────────────────────────────────────
    // La production tourne sur Cloudflare Workers, où sharp est indisponible :
    // les visuels y sont stockés tels que le navigateur les a envoyés. Ce
    // passage (sur Vercel, où sharp fonctionne) rattrape les fichiers plein
    // format — pour TOUTES les cibles, pas seulement les vignettes de campagne.
    //
    // La sonde de santé ci-dessus reste propre à `campaigns` : c'est la seule
    // table qui porte `media_status`. Ici le critère est purement textuel.
    const resizedByTarget: Record<string, number> = {}
    let resized = 0
    // Budget réparti entre les cibles, et non par cible : le passage doit tenir
    // dans la durée d'une fonction.
    const perTarget = Math.max(2, Math.floor(RESIZE_PER_RUN / NORMALIZE_TARGETS.length))

    for (const target of NORMALIZE_TARGETS) {
      let query = db
        .from(target.table)
        .select(`id, ${target.column}`)
        .like(target.column, '%/storage/v1/object/public/shoo/%')
        .not(target.column, 'ilike', '%.gif')
        // Sans tri, PostgREST peut renvoyer les mêmes lignes à chaque passage :
        // la passe ne serait pas tournante et la fin de liste jamais atteinte.
        .order('id', { ascending: true })
        .limit(perTarget)

      // Exclure chaque suffixe connu. La liste dérive des presets : le filtre
      // ne peut plus se désynchroniser des largeurs réellement produites.
      for (const suffix of NORMALIZED_SUFFIXES) {
        query = query.not(target.column, 'ilike', `%${suffix}`)
      }

      const { data: oversized } = await query

      await inChunks((oversized as Array<Record<string, any>>) ?? [], 4, async (row) => {
        const url = row[target.column] as string | null
        if (!url) return
        try {
          const res = await fetch(url)
          if (!res.ok) return
          const buf = new Uint8Array(await res.arrayBuffer())
          const norm = await normalizeImageBuffer(buf, target.width)
          if (!norm.normalized) return // sharp absent ou déjà au format cible

          const path = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${normalizedSuffix(target.width)}`
          const { error: upErr } = await db.storage
            .from('shoo')
            .upload(path, norm.buf, { contentType: 'image/webp', cacheControl: '3600', upsert: false })
          if (upErr) return

          const publicUrl = db.storage.from('shoo').getPublicUrl(path).data.publicUrl
          const { error: rowErr } = await db
            .from(target.table)
            .update({ [target.column]: publicUrl })
            .eq('id', row.id)
          if (rowErr) {
            await db.storage.from('shoo').remove([path])
            return
          }
          const old = url.match(/\/storage\/v1\/object\/public\/shoo\/(.+)$/)
          if (old) await db.storage.from('shoo').remove([decodeURIComponent(old[1])])
          resized++
          resizedByTarget[target.key] = (resizedByTarget[target.key] ?? 0) + 1
        } catch {
          /* best-effort : repassera au prochain passage */
        }
      })
    }

    // ── Réconciliation des buckets peu écrits ────────────────────────────
    // `avatars` est écrit directement par le navigateur avec la clé publiable :
    // aucune route ne passe par `ensureBucket`. Ce cron est le seul endroit qui
    // tourne avec la clé secrète — sans lui la spec resterait théorique, comme
    // `shoo` est resté plafonné à 2 Mo pendant des mois. `documents` a bien une
    // route (l'envoi d'un devis), mais quelques envois par mois : sans ce
    // passage, une dérive vers `public: true` tiendrait jusqu'au devis suivant.
    for (const spec of [AVATAR_BUCKET, AD_STUDIO_BUCKET, DOCUMENTS_BUCKET]) {
      try {
        await ensureBucket(db, spec)
      } catch (e) {
        console.error(`[cron/media-health] bucket "${spec.name}" non réconcilié :`, e)
      }
    }

    if (newlyBroken.length > 0) {
      console.error(
        `[cron/media-health] ${newlyBroken.length} visuel(s) devenu(s) inaccessible(s) :`,
        newlyBroken.map((b) => b.slug).join(', '),
      )
    }

    return NextResponse.json({
      checked: picked.length,
      ok: stillOk,
      newlyBroken: newlyBroken.length,
      slugs: newlyBroken.map((b) => b.slug),
      resized,
      resizedByTarget,
      checkedAt,
    })
  } catch (error: any) {
    console.error('[cron/media-health] échec :', error)
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 })
  }
}
