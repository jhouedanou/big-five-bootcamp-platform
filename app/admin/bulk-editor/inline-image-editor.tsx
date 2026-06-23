"use client"

import { useRef, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ImageOff,
  Upload,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Link2,
  CheckCircle2,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import {
  getGoogleDriveImageUrl,
  isGoogleDriveHostedUrl,
  isEphemeralGoogleImageUrl,
} from "@/lib/utils"
import {
  BULK_MAX_FILE_BYTES,
  BULK_MAX_FILE_LABEL,
  RESIZE_HINT,
} from "@/hooks/use-bulk-upload"
import { useMediaValidation } from "@/hooks/use-media-validation"
import {
  isVideoFile,
  VIDEO_UPLOAD_ERROR_TITLE,
  VIDEO_UPLOAD_ERROR_DESCRIPTION,
  IMAGE_TYPE_ERROR_TITLE,
  IMAGE_TYPE_ERROR_DESCRIPTION,
} from "@/lib/upload-messages"

type DriveState = "unknown" | "checking" | "public" | "restricted"

/**
 * Éditeur d'image inline pour le bulk editor.
 * - Affiche l'image déjà uploadée (thumbnail courante).
 * - Détecte les images Google Drive et vérifie leurs permissions (publique ?
 *   restreinte ?) ; si publique, les re-héberge sur Supabase (URL stable).
 * - Permet de remplacer par upload (≤ 2 Mo) ou de coller une URL.
 */
export function InlineImageEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const [driveState, setDriveState] = useState<DriveState>("unknown")
  const [driveReason, setDriveReason] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { validate } = useMediaValidation()

  const [previewError, setPreviewError] = useState(false)
  // Erreur persistante affichée en rouge dans le popover (consigne vidéo → YouTube).
  const [uploadError, setUploadError] = useState<string | null>(null)
  const isDrive = !!value && isGoogleDriveHostedUrl(value)
  const hasImage = !!value
  // Google bloque le hotlinking Drive en grille (403/429) → on NE charge PAS les
  // images Drive dans la vignette : seules les images re-hébergées (Supabase ou
  // autre host stable) s'affichent. Drive = placeholder + pastille ambre.
  const canRenderGrid = hasImage && !isDrive
  // Dans le popover (chargement unitaire), on tente l'aperçu Drive via le proxy
  // googleusercontent avec repli si 403.
  const previewSrc = isDrive ? getGoogleDriveImageUrl(value) : value

  async function handleFile(file: File) {
    setUploadError(null)
    if (isVideoFile(file)) {
      setUploadError(`${VIDEO_UPLOAD_ERROR_TITLE}. ${VIDEO_UPLOAD_ERROR_DESCRIPTION}`)
      toast.error(VIDEO_UPLOAD_ERROR_TITLE, {
        description: VIDEO_UPLOAD_ERROR_DESCRIPTION,
        duration: 10000,
      })
      return
    }
    if (!file.type.startsWith("image/")) {
      setUploadError(`${IMAGE_TYPE_ERROR_TITLE} (${file.type || "inconnu"}). ${IMAGE_TYPE_ERROR_DESCRIPTION}`)
      toast.error(IMAGE_TYPE_ERROR_TITLE, { description: IMAGE_TYPE_ERROR_DESCRIPTION })
      return
    }
    if (file.size > BULK_MAX_FILE_BYTES) {
      toast.error("Image trop lourde", { description: RESIZE_HINT })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data?.error || "Upload échoué")
      onChange(data.url)
      setDriveState("unknown")
      setDriveReason(null)
      setPreviewError(false)
      toast.success("Image uploadée")
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'upload")
    } finally {
      setUploading(false)
    }
  }

  function handlePasteUrl() {
    const u = urlInput.trim()
    if (!u) return
    if (isEphemeralGoogleImageUrl(u)) {
      toast.error("Lien Google temporaire détecté", {
        description: "Cette URL expire (403). Collez le lien de partage Drive ou uploadez le fichier.",
      })
      return
    }
    onChange(u)
    setUrlInput("")
    setDriveState("unknown")
    setDriveReason(null)
    setPreviewError(false)
    if (isGoogleDriveHostedUrl(u)) {
      toast.message("Lien Drive ajouté", { description: "Vérifiez l'accès pour le sécuriser." })
    }
  }

  /** Vérifie l'accès Drive et, si public, re-héberge sur Supabase. */
  async function checkDrivePermissions() {
    if (!value) return
    setDriveState("checking")
    setDriveReason(null)
    try {
      const r = await validate(value)
      if (r.ok) {
        setDriveState("public")
        if (r.rehostedUrl) {
          onChange(r.rehostedUrl)
          setPreviewError(false)
          toast.success("Image publique — ré-hébergée sur Supabase (URL stable)")
        } else {
          toast.success("Image publique et accessible")
        }
      } else {
        setDriveState("restricted")
        setDriveReason(r.reason)
        toast.error(r.reason || "Image Drive restreinte")
      }
    } catch (e: any) {
      setDriveState("restricted")
      setDriveReason(e?.message || "Vérification échouée")
    }
  }

  const driveDotClass =
    driveState === "public"
      ? "bg-green-500"
      : driveState === "restricted"
        ? "bg-red-500"
        : "bg-amber-500"
  const drivePermLabel =
    driveState === "public"
      ? "Drive · public"
      : driveState === "restricted"
        ? "Drive · privé"
        : "Drive · accès ?"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        {/* Visuel (non cliquable) : vraie image si hébergée, sinon logo Drive */}
        <div
          className="relative h-10 w-10 shrink-0 rounded border overflow-hidden bg-muted flex items-center justify-center"
          title={isDrive ? drivePermLabel : undefined}
        >
          {canRenderGrid ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : isDrive ? (
            <>
              <GoogleDriveIcon className="h-5 w-5" />
              <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-1 ring-white ${driveDotClass}`} />
            </>
          ) : (
            <ImageOff className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Bouton d'édition explicite */}
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2" title="Éditer l'image">
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Éditer</span>
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent className="w-80 space-y-3" align="start">
        {/* Aperçu */}
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 rounded border overflow-hidden bg-muted flex items-center justify-center">
            {hasImage && !previewError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <ImageOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 text-xs">
            {!hasImage && <span className="text-muted-foreground">Aucune image</span>}
            {hasImage && !isDrive && (
              <span className="inline-flex items-center gap-1 text-green-600">
                <ShieldCheck className="h-3.5 w-3.5" /> Hébergée (stable)
              </span>
            )}
            {isDrive && driveState === "unknown" && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <ShieldAlert className="h-3.5 w-3.5" /> Google Drive — accès non vérifié
              </span>
            )}
            {isDrive && driveState === "public" && (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Public
              </span>
            )}
            {isDrive && driveState === "restricted" && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" /> Restreint
              </span>
            )}
            {hasImage && (
              <div className="mt-1 truncate text-muted-foreground" title={value}>
                {value.length > 44 ? value.slice(0, 44) + "…" : value}
              </div>
            )}
          </div>
        </div>

        {driveReason && (
          <p className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {driveReason}
          </p>
        )}

        {/* Erreur d'upload persistante (rouge) — notamment vidéo → YouTube */}
        {uploadError && (
          <p className="rounded border border-red-300 bg-red-50 p-2 text-xs font-medium text-red-700">
            {uploadError}
          </p>
        )}

        {/* Action Drive */}
        {isDrive && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={checkDrivePermissions}
            disabled={driveState === "checking"}
          >
            {driveState === "checking" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Vérifier l'accès & sécuriser
          </Button>
        )}

        {/* Upload */}
        <div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Remplacer (upload ≤ {BULK_MAX_FILE_LABEL})
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Trop lourde ? Compressez avec{" "}
            <a href="https://www.iloveimg.com/fr/redimensionner-image" target="_blank" rel="noopener noreferrer" className="underline">
              iLoveIMG
            </a>{" "}
            ou iLovePDF.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ""
            }}
          />
        </div>

        {/* Coller URL */}
        <div className="flex items-center gap-1.5">
          <Input
            value={urlInput}
            placeholder="Coller une URL (Drive, https://…)"
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePasteUrl()}
            className="h-8 text-xs"
          />
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={handlePasteUrl}>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {hasImage && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => {
              onChange("")
              setDriveState("unknown")
              setDriveReason(null)
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Retirer l'image
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Logo officiel Google Drive (triangle tricolore). */
function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} aria-hidden="true">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  )
}
