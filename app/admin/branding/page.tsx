"use client"

import { useState, useEffect } from "react"
import { useAdmin } from "../AdminContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImagePlus, Save, Loader2, Trash2, Upload, Eye } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import Image from "next/image"

interface BrandingSettings {
  logo_url: string
  logo_dark_url: string
  favicon_url: string
  site_name: string
}

const defaultSettings: BrandingSettings = {
  logo_url: "",
  logo_dark_url: "",
  favicon_url: "",
  site_name: "Laveiye",
}

export default function BrandingPage() {
  const { isAdmin } = useAdmin()
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["logo_url", "logo_dark_url", "favicon_url", "site_name"])

      if (data && data.length > 0) {
        const loaded: Partial<BrandingSettings> = {}
        data.forEach((row: { key: string; value: string }) => {
          loaded[row.key as keyof BrandingSettings] = row.value
        })
        setSettings({ ...defaultSettings, ...loaded })
      }
    } catch {
      // Table might not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (file: File, field: keyof BrandingSettings) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formats acceptés : SVG, PNG, WEBP")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 2 Mo")
      return
    }

    setUploading(field)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de l'upload")
      }

      const { url } = await res.json()
      setSettings((prev) => ({ ...prev, [field]: url }))
      toast.success("Image uploadée avec succès")
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploading(null)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de l'enregistrement")
      }

      toast.success("Branding enregistré avec succès")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-[family-name:var(--font-heading)]">
          Branding & Logo
        </h1>
        <p className="text-gray-500 mt-1">
          Personnalisez le logo et l{"'"}identité visuelle de la plateforme
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo principal */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg">Logo principal</CardTitle>
            <CardDescription>
              Affiché dans la navbar et sur les pages publiques (fond clair).
              <span className="block text-xs mt-1 text-gray-400">Formats : SVG, PNG, WEBP · Max 2 Mo</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              {settings.logo_url ? (
                <div className="relative w-48 h-20">
                  <Image
                    src={settings.logo_url}
                    alt="Logo principal"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <ImagePlus className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Aucun logo uploadé</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Label
                htmlFor="logo-upload"
                className="flex-1 flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {uploading === "logo_url" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading === "logo_url" ? "Upload..." : "Uploader"}
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
                title="Formats acceptés : SVG, PNG, WEBP"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, "logo_url")
                }}
              />
              {settings.logo_url && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSettings((prev) => ({ ...prev, logo_url: "" }))}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="logo-url" className="text-xs text-gray-500">
                Ou coller une URL
              </Label>
              <Input
                id="logo-url"
                value={settings.logo_url}
                onChange={(e) => setSettings((prev) => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://..."
                className="text-sm bg-white border-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo dark mode */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg">Logo mode sombre</CardTitle>
            <CardDescription>
              Affiché sur les fonds sombres (optionnel).
              <span className="block text-xs mt-1 text-gray-400">Formats : SVG, PNG, WEBP · Max 2 Mo</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-700 bg-gray-900">
              {settings.logo_dark_url ? (
                <div className="relative w-48 h-20">
                  <Image
                    src={settings.logo_dark_url}
                    alt="Logo sombre"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <ImagePlus className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Aucun logo sombre</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Label
                htmlFor="logo-dark-upload"
                className="flex-1 flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {uploading === "logo_dark_url" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading === "logo_dark_url" ? "Upload..." : "Uploader"}
              </Label>
              <input
                id="logo-dark-upload"
                type="file"
                accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
                title="Formats acceptés : SVG, PNG, WEBP"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, "logo_dark_url")
                }}
              />
              {settings.logo_dark_url && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSettings((prev) => ({ ...prev, logo_dark_url: "" }))}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="logo-dark-url" className="text-xs text-gray-500">
                Ou coller une URL
              </Label>
              <Input
                id="logo-dark-url"
                value={settings.logo_dark_url}
                onChange={(e) => setSettings((prev) => ({ ...prev, logo_dark_url: e.target.value }))}
                placeholder="https://..."
                className="text-sm bg-white border-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Favicon */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg">Favicon</CardTitle>
            <CardDescription>
              Petite icône affichée dans l{"'"}onglet du navigateur (32x32 ou 64x64).
              <span className="block text-xs mt-1 text-gray-400">Formats : SVG, PNG, WEBP · Max 2 Mo</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              {settings.favicon_url ? (
                <div className="relative w-16 h-16">
                  <Image
                    src={settings.favicon_url}
                    alt="Favicon"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <ImagePlus className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Aucun favicon</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Label
                htmlFor="favicon-upload"
                className="flex-1 flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {uploading === "favicon_url" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading === "favicon_url" ? "Upload..." : "Uploader"}
              </Label>
              <input
                id="favicon-upload"
                type="file"
                accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
                title="Formats acceptés : SVG, PNG, WEBP"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, "favicon_url")
                }}
              />
              {settings.favicon_url && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSettings((prev) => ({ ...prev, favicon_url: "" }))}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="favicon-url-input" className="text-xs text-gray-500">
                Ou coller une URL
              </Label>
              <Input
                id="favicon-url-input"
                value={settings.favicon_url}
                onChange={(e) => setSettings((prev) => ({ ...prev, favicon_url: e.target.value }))}
                placeholder="https://..."
                className="text-sm bg-white border-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Nom du site */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg">Nom du site</CardTitle>
            <CardDescription>
              Affiché dans la navbar et les emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name" className="text-gray-700">
                Nom de la plateforme
              </Label>
              <Input
                id="site-name"
                value={settings.site_name}
                onChange={(e) => setSettings((prev) => ({ ...prev, site_name: e.target.value }))}
                placeholder="Laveiye"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Aperçu navbar :</p>
              <div className="flex items-center gap-2">
                {settings.logo_url ? (
                  <div className="relative w-8 h-8">
                    <Image
                      src={settings.logo_url}
                      alt="Preview"
                      fill
                      className="object-contain rounded"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#80368D]">
                    <span className="text-white text-xs font-bold">BF</span>
                  </div>
                )}
                <span className="font-[family-name:var(--font-heading)] font-bold text-gray-900">
                  {settings.site_name || "Laveiye"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-8"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer le branding
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
