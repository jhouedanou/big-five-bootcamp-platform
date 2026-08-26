import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Source unique de vérité pour la configuration des buckets Supabase Storage.
 *
 * Historiquement, chaque route déclarait sa config puis appelait `createBucket`
 * uniquement si le bucket manquait. Un bucket déjà créé gardait donc pour
 * toujours sa configuration d'origine, même après modification du code — et les
 * deux divergeaient en silence. Le bucket `shoo` en production plafonnait ainsi
 * à 2 Mo et n'acceptait que JPEG/PNG, alors que /api/upload annonçait 10 Mo et
 * six types : un PNG de 5 Mo passait la validation applicative puis était rejeté
 * par le stockage. `ensureBucket` réconcilie au lieu de créer seulement.
 */

export interface BucketSpec {
  name: string
  public: boolean
  fileSizeLimit: number
  allowedMimeTypes: string[]
}

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const IMAGE_MAX_LABEL = "10 Mo"

/**
 * SVG volontairement absent : servi depuis un bucket public, un SVG porteur de
 * script s'exécute sur l'origine du stockage. PDF absent également, et le
 * chemin `documents/` de /api/upload n'a jamais fonctionné — mais parce qu'un
 * document contractuel n'a rien à faire dans un bucket public : il relève de
 * `DOCUMENTS_BUCKET` (privé, URL signée) ou de `studies`.
 */
export const IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]

export const VIDEO_MAX_BYTES = 200 * 1024 * 1024
export const VIDEO_ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

/** Visuels publics : vignettes de campagnes, bannières, temps forts. */
export const MEDIA_BUCKET: BucketSpec = {
  name: "shoo",
  public: true,
  fileSizeLimit: IMAGE_MAX_BYTES,
  allowedMimeTypes: IMAGE_ALLOWED_TYPES,
}

export const VIDEO_BUCKET: BucketSpec = {
  name: "videos",
  public: true,
  fileSizeLimit: VIDEO_MAX_BYTES,
  allowedMimeTypes: VIDEO_ALLOWED_TYPES,
}

/**
 * Avatars de profil. L'upload part du navigateur avec la clé publiable : aucun
 * code serveur ne passe par ce chemin, donc `ensureBucket` n'y sera jamais
 * appelé. C'est le cron `media-health` qui réconcilie ce bucket — sans quoi la
 * spec resterait théorique, exactement comme `shoo` est resté à 2 Mo pendant
 * des mois alors que le code annonçait 10 Mo.
 */
export const AVATAR_BUCKET: BucketSpec = {
  name: "avatars",
  public: true,
  fileSizeLimit: 2 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
}

export const AD_STUDIO_BUCKET: BucketSpec = {
  name: "ad-studio",
  public: false,
  fileSizeLimit: 8 * 1024 * 1024,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
}

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024
export const DOCUMENT_MAX_LABEL = "10 Mo"
export const DOCUMENT_ALLOWED_TYPES = ["application/pdf"]

/**
 * Documents contractuels — aujourd'hui les devis des demandes de marque.
 *
 * PRIVÉ, contrairement à `shoo` où l'upload atterrissait avant : un devis porte
 * le nom d'un client et un montant négocié, il ne doit jamais avoir d'URL
 * publique stable. La lecture passe par /api/brand-requests/[id]/devis, qui
 * vérifie l'appelant puis signe pour quelques minutes.
 *
 * Distinct de `studies`, qui héberge les aimants à leads avec son propre flux de
 * jeton et sa limite de 100 Mo : un devis client n'a pas à y cohabiter.
 */
export const DOCUMENTS_BUCKET: BucketSpec = {
  name: "documents",
  public: false,
  fileSizeLimit: DOCUMENT_MAX_BYTES,
  allowedMimeTypes: DOCUMENT_ALLOWED_TYPES,
}

/** Réconcilié une fois par processus : la config ne bouge pas en cours de vie. */
const reconciled = new Set<string>()

function sameTypes(a: string[] | null | undefined, b: string[]): boolean {
  if (!a) return false
  if (a.length !== b.length) return false
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((v, i) => v === right[i])
}

/**
 * Garantit que le bucket existe ET que sa configuration correspond à `spec`.
 * Crée le bucket s'il manque, le met à jour si sa taille limite ou ses types
 * acceptés ont dérivé. Idempotent, et sans effet après le premier appel réussi
 * dans un même processus.
 */
export async function ensureBucket(
  admin: SupabaseClient<any, any, any>,
  spec: BucketSpec,
): Promise<void> {
  if (reconciled.has(spec.name)) return

  const { data: buckets, error: listError } = await admin.storage.listBuckets()
  if (listError) throw listError

  const existing = buckets?.find((b) => b.name === spec.name)

  if (!existing) {
    const { error } = await admin.storage.createBucket(spec.name, {
      public: spec.public,
      fileSizeLimit: spec.fileSizeLimit,
      allowedMimeTypes: spec.allowedMimeTypes,
    })
    // Course entre deux requêtes concurrentes : l'autre l'a créé, c'est bon.
    if (error && !error.message.includes("already exists")) throw error
    reconciled.add(spec.name)
    return
  }

  const drifted =
    existing.public !== spec.public ||
    Number(existing.file_size_limit) !== spec.fileSizeLimit ||
    !sameTypes(existing.allowed_mime_types, spec.allowedMimeTypes)

  if (drifted) {
    const { error } = await admin.storage.updateBucket(spec.name, {
      public: spec.public,
      fileSizeLimit: spec.fileSizeLimit,
      allowedMimeTypes: spec.allowedMimeTypes,
    })
    if (error) throw error
    console.info(
      `[storage] bucket "${spec.name}" réaligné : ${spec.fileSizeLimit} octets, ${spec.allowedMimeTypes.join(", ")}`,
    )
  }

  reconciled.add(spec.name)
}
