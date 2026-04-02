"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Loader2, ImagePlus, Link2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
  required?: boolean
  className?: string
  previewClassName?: string
  placeholder?: string
}

export function ImageUpload({
  value,
  onChange,
  label = "Image",
  required = false,
  className,
  previewClassName = "w-32 h-32",
  placeholder = "Uploadez une image ou collez une URL...",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Type non supporté: ${file.type}`, {
        description: "Types acceptés: JPG, PNG, WebP, GIF, SVG"
      })
      return
    }

    // Vérifier la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 MB)")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || "Erreur d'upload")
      }

      onChange(data.url)
      toast.success("Image uploadée avec succès !")
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error("Erreur lors de l'upload", {
        description: error.message || "Veuillez réessayer"
      })
    } finally {
      setIsUploading(false)
    }
  }, [onChange])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
    // Reset l'input pour pouvoir re-sélectionner le même fichier
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      uploadFile(file)
    } else {
      toast.error("Veuillez déposer un fichier image")
    }
  }

  const handleUrlSubmit = () => {
    const url = urlInput.trim()
    if (url) {
      onChange(url)
      setUrlInput("")
      setShowUrlInput(false)
      toast.success("URL de l'image mise à jour")
    }
  }

  const handleRemove = () => {
    onChange("")
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-gray-700">
          {label}{required && " *"}
        </Label>
      )}

      {/* Image actuelle avec aperçu */}
      {value ? (
        <div className="space-y-2">
          <div className={cn(
            "relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group",
            previewClassName
          )}>
            <img
              src={value}
              alt="Aperçu"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg'
              }}
            />
            {/* Overlay avec actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Changer
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Retirer
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 truncate max-w-sm" title={value}>
            {value.length > 60 ? value.substring(0, 60) + '...' : value}
          </p>
        </div>
      ) : (
        /* Zone de drop / upload */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-gray-500">Upload en cours...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <ImagePlus className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Cliquez ou glissez une image ici
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, WebP, GIF • Max 10 MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
        aria-label="Sélectionner une image"
      />

      {/* Toggle pour URL manuelle */}
      {!showUrlInput ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto"
          onClick={() => setShowUrlInput(true)}
        >
          <Link2 className="h-3 w-3 mr-1" />
          Ou coller une URL d'image
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleUrlSubmit()
              }
              if (e.key === 'Escape') {
                setShowUrlInput(false)
                setUrlInput("")
              }
            }}
            placeholder="https://..."
            className="bg-white border-gray-300 text-gray-900 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUrlSubmit}
            className="border-gray-300 whitespace-nowrap"
          >
            OK
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowUrlInput(false)
              setUrlInput("")
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Composant pour uploader une image supplémentaire dans le carousel
 * Retourne l'URL uploadée via le callback
 */
interface ImageUploadButtonProps {
  onUploaded: (url: string) => void
  className?: string
}

export function ImageUploadButton({ onUploaded, className }: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Type non supporté: ${file.type}`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 MB)")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || "Erreur d'upload")
      }

      onUploaded(data.url)
      toast.success("Image uploadée !")
    } catch (error: any) {
      toast.error("Erreur lors de l'upload", {
        description: error.message
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
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadFile(file)
          e.target.value = ''
        }}
        disabled={isUploading}
        aria-label="Sélectionner une image à uploader"
      />
      <Button
        type="button"
        variant="outline"
        className={cn(
          "border-gray-300 text-gray-700 hover:bg-gray-100 gap-2",
          className
        )}
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isUploading ? "Upload..." : "Uploader"}
      </Button>
    </>
  )
}
