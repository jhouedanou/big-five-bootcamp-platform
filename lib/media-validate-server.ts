import { createClient } from "@supabase/supabase-js"
import { ssrfSafeFetch, ssrfSafeFetchTraced } from "@/lib/ssrf-fetch"
import {
  classifyMediaUrl,
  MEDIA_REASONS,
  type MediaValidationResult,
} from "@/lib/media-validation"
import {
  extractGoogleDriveFileId,
  getEmbedUrl,
  detectVideoPlatform,
} from "@/lib/video-utils"
import { isGoogleDriveHostedUrl, isEphemeralGoogleImageUrl } from "@/lib/utils"

/**
 * Cœur de validation média côté serveur (runtime Node.js requis : node:dns via
 * ssrf-fetch). Sonde l'accès public, l'embeddabilité, et re-héberge les images
 * Google Drive sur Supabase. Partagé par l'API /api/admin/validate-media et la
 * server action de re-hébergement en masse.
 */

const BUCKET_NAME = "shoo"
const MAX_REHOST_BYTES = 10 * 1024 * 1024 // 10 MB (aligné sur /api/upload)
const FETCH_TIMEOUT_MS = 8000

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Server misconfigured")
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function withTimeout(ms: number): RequestInit {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal }
}

function emptyResult(url: string): MediaValidationResult {
  return {
    url,
    kind: "unknown",
    platform: null,
    isPublic: null,
    embeddable: null,
    embedUrl: null,
    rehostedUrl: null,
    contentType: null,
    ok: false,
    reason: null,
  }
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
}

async function rehostImage(sourceUrl: string, contentType: string): Promise<string> {
  const res = await ssrfSafeFetch(sourceUrl, withTimeout(FETCH_TIMEOUT_MS))
  if (!res.ok) throw new Error(`download ${res.status}`)

  const len = parseInt(res.headers.get("content-length") || "0", 10)
  if (len && len > MAX_REHOST_BYTES) throw new Error("image trop volumineuse (>10MB)")

  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.byteLength > MAX_REHOST_BYTES) throw new Error("image trop volumineuse (>10MB)")

  const ext = EXT_BY_MIME[contentType.split(";")[0].trim()] || "jpg"
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const filePath = `thumbnails/${fileName}`

  const db = supabaseAdmin()
  const { data, error } = await db.storage
    .from(BUCKET_NAME)
    .upload(filePath, buf, { contentType, cacheControl: "3600", upsert: false })
  if (error) throw error

  const { data: pub } = db.storage.from(BUCKET_NAME).getPublicUrl(data.path)
  return pub.publicUrl
}

async function probeDrive(fileId: string): Promise<{
  isPublic: boolean
  contentType: string | null
  isImage: boolean
  isVideo: boolean
  reason: string | null
}> {
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
  const { res, redirectedToLogin } = await ssrfSafeFetchTraced(downloadUrl, {
    method: "GET",
    headers: { Range: "bytes=0-4096" },
    ...withTimeout(FETCH_TIMEOUT_MS),
  })

  if (redirectedToLogin)
    return { isPublic: false, contentType: null, isImage: false, isVideo: false, reason: MEDIA_REASONS.driveRequestAccess }
  if (res.status === 404)
    return { isPublic: false, contentType: null, isImage: false, isVideo: false, reason: MEDIA_REASONS.unreachable }
  if (res.status === 403)
    return { isPublic: false, contentType: null, isImage: false, isVideo: false, reason: MEDIA_REASONS.drivePrivate }

  const ct = (res.headers.get("content-type") || "").toLowerCase()

  if (ct.startsWith("text/html")) {
    const snippet = (await res.text()).slice(0, 4000).toLowerCase()
    const looksPrivate = /sign in|connectez-vous|request access|demander l['e2’]?acc|you need access/i.test(snippet)
    const looksScanWarning = /download_warning|uc-download-link|virus scan|impossible d['e2’]?analyser/i.test(snippet)
    if (looksPrivate || !looksScanWarning)
      return { isPublic: false, contentType: "text/html", isImage: false, isVideo: false, reason: MEDIA_REASONS.drivePrivate }
    return { isPublic: true, contentType: null, isImage: false, isVideo: true, reason: null }
  }

  return {
    isPublic: true,
    contentType: ct || null,
    isImage: ct.startsWith("image/"),
    isVideo: ct.startsWith("video/"),
    reason: null,
  }
}

async function probeYouTube(url: string): Promise<{ embeddable: boolean; isPublic: boolean; reason: string | null }> {
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  try {
    const res = await ssrfSafeFetch(oembed, withTimeout(FETCH_TIMEOUT_MS))
    if (res.status === 401) return { embeddable: false, isPublic: true, reason: MEDIA_REASONS.embedDisabled }
    if (res.status === 404) return { embeddable: false, isPublic: false, reason: MEDIA_REASONS.unreachable }
    if (res.ok) return { embeddable: true, isPublic: true, reason: null }
    return { embeddable: false, isPublic: false, reason: MEDIA_REASONS.unreachable }
  } catch {
    return { embeddable: false, isPublic: false, reason: MEDIA_REASONS.unreachable }
  }
}

async function probeReachable(url: string): Promise<boolean> {
  try {
    const res = await ssrfSafeFetch(url, { method: "GET", ...withTimeout(FETCH_TIMEOUT_MS) })
    return res.status >= 200 && res.status < 400
  } catch {
    return false
  }
}

/** Valide (et re-héberge si image Drive publique) une URL média. */
export async function validateMediaUrl(rawUrl: string): Promise<MediaValidationResult> {
  const url = (rawUrl || "").trim()
  const out = emptyResult(url)
  if (!url) return { ...out, reason: MEDIA_REASONS.unknown }

  if (isEphemeralGoogleImageUrl(url)) {
    return { ...out, kind: "direct-image", reason: MEDIA_REASONS.ephemeral }
  }

  const { kind, platform } = classifyMediaUrl(url)
  out.kind = kind
  out.platform = platform

  try {
    if (kind === "drive-file") {
      const fileId = extractGoogleDriveFileId(url)
      const probe = await probeDrive(fileId)
      out.isPublic = probe.isPublic
      out.contentType = probe.contentType
      if (!probe.isPublic) return { ...out, ok: false, reason: probe.reason }
      if (probe.isVideo) {
        out.embeddable = true
        out.embedUrl = `https://drive.google.com/file/d/${fileId}/preview`
        return { ...out, ok: true }
      }
      try {
        out.rehostedUrl = await rehostImage(
          `https://drive.google.com/uc?export=download&id=${fileId}`,
          probe.contentType || "image/jpeg",
        )
        return { ...out, ok: true }
      } catch (e: any) {
        return { ...out, ok: false, reason: `Ré-hébergement échoué : ${e?.message || "erreur"}` }
      }
    }

    if (kind === "video-platform") {
      out.embedUrl = getEmbedUrl(url)
      const p = detectVideoPlatform(url)
      if (p === "youtube") {
        const yt = await probeYouTube(url)
        out.embeddable = yt.embeddable
        out.isPublic = yt.isPublic
        return { ...out, ok: yt.embeddable, reason: yt.reason }
      }
      const reachable = await probeReachable(url)
      out.isPublic = reachable
      out.embeddable = reachable
      return { ...out, ok: reachable, reason: reachable ? null : MEDIA_REASONS.unreachable }
    }

    if (kind === "direct-image") {
      if (isGoogleDriveHostedUrl(url)) {
        try {
          out.rehostedUrl = await rehostImage(url, "image/jpeg")
          out.isPublic = true
          return { ...out, ok: true }
        } catch {
          return { ...out, ok: false, isPublic: false, reason: MEDIA_REASONS.drivePrivate }
        }
      }
      const res = await ssrfSafeFetch(url, { method: "GET", headers: { Range: "bytes=0-1024" }, ...withTimeout(FETCH_TIMEOUT_MS) })
      const ct = (res.headers.get("content-type") || "").toLowerCase()
      out.contentType = ct || null
      const okImg = res.status >= 200 && res.status < 400 && ct.startsWith("image/")
      out.isPublic = okImg
      return { ...out, ok: okImg, reason: okImg ? null : MEDIA_REASONS.unreachable }
    }

    return { ...out, ok: false, reason: MEDIA_REASONS.unknown }
  } catch (e: any) {
    return { ...out, ok: false, reason: e?.message || MEDIA_REASONS.unreachable }
  }
}

/** Exécute en lots de `size` pour limiter la charge réseau sortante. */
export async function inChunks<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size)
    out.push(...(await Promise.all(batch.map(fn))))
  }
  return out
}
