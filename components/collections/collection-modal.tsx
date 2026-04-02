"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FolderPlus, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"

interface CollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si présent, le modal est en mode édition */
  editingCollection?: {
    id: string
    name: string
    description?: string
  } | null
  onSave: (data: { name: string; description: string }) => Promise<void>
}

export function CollectionModal({
  open,
  onOpenChange,
  editingCollection,
  onSave,
}: CollectionModalProps) {
  const [name, setName] = useState(editingCollection?.name || "")
  const [description, setDescription] = useState(editingCollection?.description || "")
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(editingCollection?.name || "")
      setDescription(editingCollection?.description || "")
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Le nom de la collection est requis")
      return
    }

    setIsSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim() })
      onOpenChange(false)
      setName("")
      setDescription("")
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  const isEditing = !!editingCollection

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="h-5 w-5 text-[#80368D]" />
                Modifier la collection
              </>
            ) : (
              <>
                <FolderPlus className="h-5 w-5 text-[#80368D]" />
                Nouvelle collection
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez le nom et la description de votre collection."
              : "Créez une collection pour organiser vos campagnes favorites, comme une playlist YouTube."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="collection-name">Nom de la collection *</Label>
            <Input
              id="collection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Inspirations Télécoms Q4"
              className="bg-white border-gray-300"
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="collection-description">
              Description <span className="text-gray-400 text-xs">(optionnel)</span>
            </Label>
            <Textarea
              id="collection-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le contenu de cette collection..."
              className="bg-white border-gray-300 resize-none h-20"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right">{description.length}/500</p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="bg-[#80368D] hover:bg-[#80368D]/90 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Enregistrement..." : "Création..."}
                </>
              ) : isEditing ? (
                "Enregistrer"
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Créer la collection
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
