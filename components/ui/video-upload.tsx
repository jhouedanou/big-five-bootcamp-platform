"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Video, HelpCircle, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { normalizeImageFile } from "@/lib/image-client"
import { IMAGE_PRESETS } from "@/lib/image-presets"
import { captureVideoPoster } from "@/lib/video-poster"

const VIDEO_MAX_BYTES = 200 * 1024 * 1024 // garder aligné avec /api/upload/video
const VIDEO_ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

/**
 * Résolution maximale acceptée. Comme pour les images (580 px), l'objectif est
 * de ne pas surcharger le stockage : une vidéo 1080p pèse 5 à 10 fois une
 * 640×480 pour un rendu identique dans les cartes du site. Le WebM est
 * recommandé (2 à 3 fois plus léger que le MP4 à qualité égale) mais pas
 * imposé. Pas de transcodage possible côté plateforme : la fenêtre d'aide
 * guide l'admin vers CloudConvert ou HandBrake.
 */
const VIDEO_MAX_WIDTH = 640
const VIDEO_MAX_HEIGHT = 480

/** Lit la résolution d'un fichier vidéo dans le navigateur, sans l'envoyer. */
function readVideoResolution(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    const done = (r: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url)
      resolve(r)
    }
    video.onloadedmetadata = () => done({ width: video.videoWidth, height: video.videoHeight })
    video.onerror = () => done(null)
    setTimeout(() => done(null), 8000)
    video.src = url
  })
}

/**
 * Fenêtre d'aide : comment amener une vidéo au format attendu (WebM, 640×480).
 * Détaillée pas à pas — elle s'affiche aussi quand un fichier est refusé.
 */
export function VideoConvertHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convertir une vidéo en WebM 640×480</DialogTitle>
          <DialogDescription>
            Les vidéos de campagne sont limitées à <strong>640×480</strong>, au
            format <strong>WebM</strong> de préférence, pour garder la
            plateforme rapide. Deux outils gratuits font la conversion en
            quelques minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border p-3">
            <p className="font-semibold">
              Option 1 — CloudConvert (en ligne, sans installation)
            </p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Ouvrir{" "}
                <a
                  href="https://cloudconvert.com/webm-converter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  cloudconvert.com/webm-converter <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Sélectionner le fichier, sortie « WebM ».</li>
              <li>
                Dans les options (icône clé à molette) : largeur <strong>640</strong>,
                hauteur <strong>480</strong>, « Fit » sur <em>scale</em>.
              </li>
              <li>Convertir, télécharger, puis uploader le fichier ici.</li>
            </ol>
          </div>

          <div className="rounded-md border p-3">
            <p className="font-semibold">Option 2 — HandBrake (logiciel gratuit)</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Télécharger{" "}
                <a
                  href="https://handbrake.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  handbrake.fr <ExternalLink className="h-3 w-3" />
                </a>{" "}
                et ouvrir la vidéo.
              </li>
              <li>Format : <strong>WebM</strong> (onglet « Summary »).</li>
              <li>
                Onglet « Dimensions » : résolution <strong>640×480</strong>{" "}
                (ou 640 de large en gardant les proportions).
              </li>
              <li>« Start Encode », puis uploader le fichier produit ici.</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground">
            Le MP4 reste accepté s'il respecte 640×480, mais le WebM est 2 à 3
            fois plus léger à qualité égale.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface VideoUploadButtonProps {
  /**
   * `posterUrl` est l'image capturée dans la vidéo et hébergée sur la
   * plateforme. Absente si le navigateur n'a pas su décoder le fichier.
   */
  onUploaded: (url: string, posterUrl?: string) => void
  className?: string
}

/**
 * Upload vidéo admin (LOT H) : le fichier part DIRECTEMENT vers Supabase
 * Storage via une URL signée — il ne transite jamais par une fonction Vercel
 * (limite de corps ~4,5 Mo qui faisait échouer l'upload).
 */
export function VideoUploadButton({ onUploaded, className }: VideoUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    if (!VIDEO_ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Format non supporté : ${file.type || "inconnu"}`, {
        description: "Formats acceptés : MP4, WebM, MOV.",
      })
      return
    }
    if (file.size > VIDEO_MAX_BYTES) {
      toast.error("Vidéo trop volumineuse", {
        description: `Taille maximale : ${Math.round(VIDEO_MAX_BYTES / (1024 * 1024))} Mo.`,
      })
      return
    }

    // Résolution lue dans le navigateur : au-delà de 640×480, on refuse et on
    // ouvre l'aide à la conversion — la plateforme ne transcode pas.
    const resolution = await readVideoResolution(file)
    if (resolution && (resolution.width > VIDEO_MAX_WIDTH || resolution.height > VIDEO_MAX_HEIGHT)) {
      toast.error(`Vidéo trop grande : ${resolution.width}×${resolution.height}`, {
        description: `Maximum accepté : ${VIDEO_MAX_WIDTH}×${VIDEO_MAX_HEIGHT}. La fenêtre d'aide explique comment convertir.`,
        duration: 10000,
      })
      setHelpOpen(true)
      return
    }
    if (file.type !== "video/webm") {
      toast.message("Conseil : préférez le WebM", {
        description: "2 à 3 fois plus léger que le MP4 à qualité égale — voir « Comment convertir ? ».",
      })
    }

    setIsUploading(true)
    try {
      // 1) Demander une URL d'upload signée.
      const res = await fetch("/api/upload/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.uploadUrl) {
        throw new Error(data.error || "Impossible de préparer l'upload")
      }

      // 2) Upload direct vers Supabase Storage (PUT sur l'URL signée).
      const putRes = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!putRes.ok) {
        const text = await putRes.text().catch(() => "")
        throw new Error(`Échec de l'envoi vers le stockage (${putRes.status}). ${text.slice(0, 120)}`)
      }

      // 3) Vignette : capturée sur le fichier local puis hébergée. Sans elle la
      //    campagne s'affiche sans visuel sur le tableau de bord.
      let posterUrl: string | undefined
      try {
        const poster = await captureVideoPoster(file)
        if (poster) {
          // Le poster sert de vignette de campagne : même largeur que les autres.
          const normalized = await normalizeImageFile(poster, IMAGE_PRESETS.campaignThumb)
          const form = new FormData()
          form.append("file", normalized)
          form.append("maxWidth", String(IMAGE_PRESETS.campaignThumb))
          const posterRes = await fetch("/api/upload", { method: "POST", body: form })
          const posterData = await posterRes.json().catch(() => ({}))
          if (posterRes.ok && posterData.url) posterUrl = posterData.url
        }
      } catch {
        /* silencieux : l'admin peut toujours uploader une image à la main */
      }

      onUploaded(data.publicUrl, posterUrl)
      toast.success(
        posterUrl
          ? "Vidéo uploadée — vignette générée automatiquement."
          : "Vidéo uploadée avec succès !"
      )
    } catch (error: any) {
      toast.error("Erreur lors de l'upload vidéo", {
        description: error?.message || "Veuillez réessayer.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadFile(file)
          e.target.value = ""
        }}
        disabled={isUploading}
        aria-label="Sélectionner une vidéo à uploader"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn("gap-2 border-gray-300 text-gray-700 hover:bg-gray-100", className)}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title={`WebM recommandé — ${VIDEO_MAX_WIDTH}×${VIDEO_MAX_HEIGHT} max — ${Math.round(VIDEO_MAX_BYTES / (1024 * 1024))} Mo max`}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          {isUploading ? "Upload vidéo…" : "Uploader une vidéo"}
        </Button>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline hover:text-foreground"
        >
          <HelpCircle className="h-3.5 w-3.5" /> Comment convertir ?
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        WebM recommandé · {VIDEO_MAX_WIDTH}×{VIDEO_MAX_HEIGHT} max ·{" "}
        {Math.round(VIDEO_MAX_BYTES / (1024 * 1024))} Mo max
      </p>
      <VideoConvertHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
