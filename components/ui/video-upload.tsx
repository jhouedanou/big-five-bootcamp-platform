"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, Video } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const VIDEO_MAX_BYTES = 200 * 1024 * 1024 // garder aligné avec /api/upload/video
const VIDEO_ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

interface VideoUploadButtonProps {
  onUploaded: (url: string) => void
  className?: string
}

/**
 * Upload vidéo admin (LOT H) : le fichier part DIRECTEMENT vers Supabase
 * Storage via une URL signée — il ne transite jamais par une fonction Vercel
 * (limite de corps ~4,5 Mo qui faisait échouer l'upload).
 */
export function VideoUploadButton({ onUploaded, className }: VideoUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false)
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

      onUploaded(data.publicUrl)
      toast.success("Vidéo uploadée avec succès !")
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
      <Button
        type="button"
        variant="outline"
        className={cn("gap-2 border-gray-300 text-gray-700 hover:bg-gray-100", className)}
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="MP4, WebM ou MOV — max 200 Mo"
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
        {isUploading ? "Upload vidéo…" : "Uploader une vidéo"}
      </Button>
    </>
  )
}
