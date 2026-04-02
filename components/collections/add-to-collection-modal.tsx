"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FolderPlus, Loader2, Check, Plus, FolderOpen } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Collection {
  id: string
  name: string
  item_count: number
  campaign_ids: string[]
}

interface AddToCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  campaignTitle?: string
}

export function AddToCollectionModal({
  open,
  onOpenChange,
  campaignId,
  campaignTitle,
}: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [showNewInput, setShowNewInput] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Charger les collections à l'ouverture
  const loadCollections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/collections")
      if (res.ok) {
        const data = await res.json()
        setCollections(data.collections || [])
      }
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadCollections()
      setShowNewInput(false)
      setNewName("")
    }
  }, [open, loadCollections])

  // Vérifier si la campagne est dans une collection
  const isInCollection = (col: Collection) => {
    return col.campaign_ids?.includes(campaignId)
  }

  // Ajouter/retirer d'une collection
  const toggleCollection = async (col: Collection) => {
    const isIn = isInCollection(col)
    setTogglingIds(prev => new Set(prev).add(col.id))

    try {
      if (isIn) {
        // Retirer
        const res = await fetch(`/api/collections/items?collectionId=${col.id}&campaignId=${campaignId}`, {
          method: "DELETE",
        })
        if (res.ok) {
          setCollections(prev =>
            prev.map(c =>
              c.id === col.id
                ? { ...c, campaign_ids: c.campaign_ids.filter(id => id !== campaignId), item_count: c.item_count - 1 }
                : c
            )
          )
          toast.success(`Retiré de « ${col.name} »`)
        } else {
          toast.error("Erreur lors du retrait")
        }
      } else {
        // Ajouter
        const res = await fetch("/api/collections/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collectionId: col.id, campaignId }),
        })
        if (res.ok) {
          setCollections(prev =>
            prev.map(c =>
              c.id === col.id
                ? { ...c, campaign_ids: [...(c.campaign_ids || []), campaignId], item_count: c.item_count + 1 }
                : c
            )
          )
          toast.success(`Ajouté à « ${col.name} »`)
        } else if (res.status === 409) {
          toast.info("Déjà dans cette collection")
        } else {
          toast.error("Erreur lors de l'ajout")
        }
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(col.id)
        return next
      })
    }
  }

  // Créer une nouvelle collection et y ajouter la campagne
  const createAndAdd = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        const newCol = data.collection

        // Ajouter la campagne à cette nouvelle collection
        await fetch("/api/collections/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collectionId: newCol.id, campaignId }),
        })

        setCollections(prev => [
          ...prev,
          { ...newCol, campaign_ids: [campaignId], item_count: 1 },
        ])
        setNewName("")
        setShowNewInput(false)
        toast.success(`Collection « ${newCol.name} » créée`)
      } else {
        toast.error("Impossible de créer la collection")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-white max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FolderPlus className="h-5 w-5 text-[#80368D]" />
            Ajouter à une collection
          </DialogTitle>
          {campaignTitle && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {campaignTitle}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#80368D]" />
            </div>
          ) : collections.length === 0 && !showNewInput ? (
            <div className="text-center py-6">
              <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Aucune collection pour l&apos;instant
              </p>
              <Button
                size="sm"
                onClick={() => setShowNewInput(true)}
                className="bg-[#80368D] hover:bg-[#80368D]/90 text-white"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Créer ma première collection
              </Button>
            </div>
          ) : (
            <>
              {collections.map((col) => {
                const isIn = isInCollection(col)
                const isToggling = togglingIds.has(col.id)
                return (
                  <button
                    key={col.id}
                    onClick={() => toggleCollection(col)}
                    disabled={isToggling}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all border",
                      isIn
                        ? "bg-[#80368D]/5 border-[#80368D]/30 hover:bg-[#80368D]/10"
                        : "bg-white border-gray-200 hover:bg-gray-50 hover:border-[#80368D]/20",
                      isToggling && "opacity-50 cursor-wait"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        isIn
                          ? "bg-[#80368D] text-white"
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isIn ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <FolderOpen className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1F2B] truncate">
                        {col.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {col.item_count} campagne{col.item_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {isIn && (
                      <span className="text-xs font-medium text-[#80368D] shrink-0">
                        ✓ Ajouté
                      </span>
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* Créer une nouvelle collection */}
        <div className="border-t pt-3 mt-2">
          {showNewInput ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom de la collection..."
                className="flex-1 bg-white border-gray-300 text-sm"
                autoFocus
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createAndAdd()
                  if (e.key === "Escape") {
                    setShowNewInput(false)
                    setNewName("")
                  }
                }}
              />
              <Button
                size="sm"
                onClick={createAndAdd}
                disabled={!newName.trim() || creating}
                className="bg-[#80368D] hover:bg-[#80368D]/90 text-white shrink-0"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewInput(true)}
              className="w-full gap-2 text-[#80368D] border-[#80368D]/30 hover:bg-[#80368D]/5"
            >
              <FolderPlus className="h-4 w-4" />
              Nouvelle collection
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
