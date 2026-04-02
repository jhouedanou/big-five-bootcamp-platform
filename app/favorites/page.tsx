'use client'

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useFavorites } from "@/hooks/use-favorites"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, LogIn, Trash2, BookmarkCheck, ArrowLeft, FolderOpen, FolderPlus, X, Lock, Pencil, FolderInput, Share2, Globe, Link2, Check, XCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import Image from "next/image"
import { cn, getGoogleDriveImageUrl } from "@/lib/utils"
import { isPaidPlan } from "@/lib/pricing"
import { CollectionModal } from "@/components/collections/collection-modal"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuthContext } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase"

interface Collection {
  id: string
  name: string
  created_at: string
  item_count: number
  campaign_ids: string[]
  share_token?: string | null
  is_shared?: boolean
}

function FavoritesPageContent() {
  const {
    favoritesWithCampaigns,
    fetchFavoritesWithCampaigns,
    removeFavorite,
    loading,
    isAuthenticated,
    error
  } = useFavorites()
  const { userPlan: contextPlan } = useAuthContext()
  const [mounted, setMounted] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeCollection, setActiveCollection] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false)
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [editingCollectionName, setEditingCollectionName] = useState("")
  const [addToCollectionCampaignId, setAddToCollectionCampaignId] = useState<string | null>(null)
  const [sharingCollectionId, setSharingCollectionId] = useState<string | null>(null)
  const [copiedCollectionId, setCopiedCollectionId] = useState<string | null>(null)
  const [shareModalCollection, setShareModalCollection] = useState<Collection | null>(null)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [collectionCampaigns, setCollectionCampaigns] = useState<any[]>([])
  const [loadingCollectionCampaigns, setLoadingCollectionCampaigns] = useState(false)
  const [collectionThumbnails, setCollectionThumbnails] = useState<Record<string, string[]>>({})
  const supabase = createClient()

  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') === 'collections' ? 'collections' : 'favorites'

  const isPaid = isPaidPlan(contextPlan)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchFavoritesWithCampaigns()
      loadCollections()
    }
  }, [mounted, isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCollections = async () => {
    try {
      const res = await fetch('/api/collections')
      if (res.ok) {
        const data = await res.json()
        const cols = data.collections || []
        setCollections(cols)
        // Charger les thumbnails pour le preview des collections
        const allCampaignIds = [...new Set(cols.flatMap((c: Collection) => c.campaign_ids || []))]
        if (allCampaignIds.length > 0) {
          const { data: thumbData } = await supabase
            .from('campaigns')
            .select('id, thumbnail')
            .in('id', allCampaignIds)
          if (thumbData) {
            const thumbMap: Record<string, string> = {}
            thumbData.forEach((t: any) => { if (t.thumbnail) thumbMap[t.id] = t.thumbnail })
            const result: Record<string, string[]> = {}
            cols.forEach((col: Collection) => {
              result[col.id] = (col.campaign_ids || [])
                .map((id: string) => thumbMap[id])
                .filter(Boolean)
                .slice(0, 4)
            })
            setCollectionThumbnails(result)
          }
        }
      }
    } catch { /* Table pas encore créée */ }
  }

  const loadCollectionCampaigns = async (campaignIds: string[]) => {
    if (campaignIds.length === 0) {
      setCollectionCampaigns([])
      return
    }
    setLoadingCollectionCampaigns(true)
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('id', campaignIds)
      if (!error && data) {
        setCollectionCampaigns(data)
      } else {
        setCollectionCampaigns([])
      }
    } catch { setCollectionCampaigns([]) }
    finally { setLoadingCollectionCampaigns(false) }
  }

  // Charger les campagnes quand une collection est sélectionnée
  useEffect(() => {
    if (activeCollection) {
      const col = collections.find(c => c.id === activeCollection)
      if (col) {
        loadCollectionCampaigns(col.campaign_ids)
      }
    } else {
      setCollectionCampaigns([])
    }
  }, [activeCollection]) // eslint-disable-line react-hooks/exhaustive-deps

  const createCollection = async () => {
    if (!newCollectionName.trim()) return
    setCreatingCollection(true)
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setCollections(prev => [...prev, data.collection])
        setNewCollectionName("")
        setShowNewCollectionInput(false)
        toast.success(`Collection « ${data.collection.name} » créée`)
      } else {
        toast.error("Impossible de créer la collection")
      }
    } catch { toast.error("Erreur lors de la création") } finally { setCreatingCollection(false) }
  }

  const handleCollectionModalSave = async (data: { name: string; description: string }) => {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, description: data.description }),
    })
    if (res.ok) {
      const result = await res.json()
      setCollections(prev => [...prev, result.collection])
      toast.success(`Collection « ${result.collection.name} » créée`)
    } else {
      throw new Error("Impossible de créer la collection")
    }
  }

  const renameCollection = async (id: string, newName: string) => {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName.trim() }),
      })
      if (res.ok) {
        setCollections(prev => prev.map(c => c.id === id ? { ...c, name: newName.trim() } : c))
        toast.success("Collection renommée")
      }
    } catch { /* ignore */ }
    setEditingCollectionId(null)
    setEditingCollectionName("")
  }

  const deleteCollection = async (id: string) => {
    if (!confirm('Supprimer cette collection ? Les favoris ne seront pas supprimés.')) return
    const name = collections.find(c => c.id === id)?.name
    try {
      const res = await fetch(`/api/collections?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCollections(prev => prev.filter(c => c.id !== id))
        if (activeCollection === id) setActiveCollection(null)
        toast.success(`Collection « ${name} » supprimée`)
      } else {
        toast.error("Impossible de supprimer la collection")
      }
    } catch { toast.error("Erreur lors de la suppression") }
  }

  const addToCollection = async (collectionId: string, campaignId: string) => {
    const colName = collections.find(c => c.id === collectionId)?.name
    try {
      const res = await fetch('/api/collections/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, campaignId }),
      })
      if (res.ok) {
        setCollections(prev => prev.map(c => {
          if (c.id === collectionId) {
            return {
              ...c,
              item_count: c.item_count + 1,
              campaign_ids: [...c.campaign_ids, campaignId],
            }
          }
          return c
        }))
        toast.success(`Ajouté à la collection « ${colName} »`)
      } else {
        const data = await res.json()
        if (res.status === 409) {
          toast.info(`Déjà dans « ${colName} »`)
        } else {
          toast.error(data.error || "Impossible d'ajouter à la collection")
        }
      }
    } catch { toast.error("Erreur lors de l'ajout") }
    setAddToCollectionCampaignId(null)
  }

  const removeFromCollection = async (collectionId: string, campaignId: string) => {
    const colName = collections.find(c => c.id === collectionId)?.name
    try {
      const res = await fetch(`/api/collections/items?collectionId=${collectionId}&campaignId=${campaignId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setCollections(prev => prev.map(c => {
          if (c.id === collectionId) {
            return {
              ...c,
              item_count: Math.max(0, c.item_count - 1),
              campaign_ids: c.campaign_ids.filter(id => id !== campaignId),
            }
          }
          return c
        }))
        setCollectionCampaigns(prev => prev.filter(c => c.id !== campaignId))
        toast.success(`Retiré de la collection « ${colName} »`)
      }
    } catch { /* ignore */ }
  }

  const openShareModal = async (col: Collection) => {
    if (col.is_shared && col.share_token) {
      setShareModalCollection(col)
      return
    }
    // Générer le token d'abord
    setSharingCollectionId(col.id)
    try {
      const res = await fetch('/api/collections/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: col.id }),
      })
      if (res.ok) {
        const data = await res.json()
        const updated = { ...col, share_token: data.share_token, is_shared: true }
        setCollections(prev => prev.map(c => c.id === col.id ? updated : c))
        setShareModalCollection(updated)
      } else {
        toast.error("Impossible d'activer le partage")
      }
    } catch { toast.error("Erreur réseau") } finally { setSharingCollectionId(null) }
  }

  const shareCollection = async (collectionId: string) => {
    setSharingCollectionId(collectionId)
    try {
      const res = await fetch('/api/collections/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId }),
      })
      if (res.ok) {
        const data = await res.json()
        setCollections(prev => prev.map(c =>
          c.id === collectionId ? { ...c, share_token: data.share_token, is_shared: true } : c
        ))
        toast.success("Lien de partage activé")
      } else {
        toast.error("Impossible d'activer le partage")
      }
    } catch { toast.error("Erreur lors du partage") } finally { setSharingCollectionId(null) }
  }

  const revokeShare = async (collectionId: string) => {
    try {
      const res = await fetch(`/api/collections/share?id=${collectionId}`, { method: 'DELETE' })
      if (res.ok) {
        setCollections(prev => prev.map(c =>
          c.id === collectionId ? { ...c, share_token: null, is_shared: false } : c
        ))
        toast.success("Partage révoqué")
      }
    } catch { /* ignore */ }
  }

  const copyShareLink = (token: string, collectionId: string) => {
    const url = `${window.location.origin}/shared/${token}`
    navigator.clipboard.writeText(url)
    setCopiedCollectionId(collectionId)
    setTimeout(() => setCopiedCollectionId(null), 2000)
    toast.success("Lien copié dans le presse-papier")
  }

  const handleRemove = async (campaignId: string) => {
    setRemovingId(campaignId)
    await removeFavorite(campaignId)
    setRemovingId(null)
  }

  const campaigns = mounted && isAuthenticated && !loading && !error
    ? favoritesWithCampaigns.filter(f => f.campaign)
    : []

  const filteredCampaigns = activeCollection
    ? collectionCampaigns.map(c => ({
        id: c.id,
        campaign_id: c.id,
        campaign: c,
      }))
    : campaigns

  const renderContent = () => {
    if (!mounted || (isAuthenticated && loading) || (activeCollection && loadingCollectionCampaigns)) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#80368D] mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">Chargement de vos favoris...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0E4F2] bg-gradient-to-br from-[#f8fafc] to-[#f0f4ff] p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#80368D]/10">
            <LogIn className="h-10 w-10 text-[#80368D]" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-[#1A1F2B]">Connexion requise</h3>
          <p className="mt-2 text-muted-foreground max-w-md">
            Connectez-vous pour accéder à vos favoris et retrouver vos campagnes sauvegardées.
          </p>
          <div className="mt-6 flex gap-4">
            <Link href="/login?redirect=/favorites">
              <Button className="bg-[#80368D] hover:bg-[#6b2d78]">
                <LogIn className="h-4 w-4 mr-2" />Se connecter
              </Button>
            </Link>
            <Link href="/register?redirect=/favorites">
              <Button variant="outline">Créer un compte</Button>
            </Link>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-red-600">Erreur</h3>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={() => fetchFavoritesWithCampaigns()} className="mt-4" variant="outline">Réessayer</Button>
        </div>
      )
    }

    if (filteredCampaigns.length === 0) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0E4F2] bg-gradient-to-br from-[#f8fafc] to-[#f0f4ff] p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#D0E4F2]">
            {activeCollection ? <FolderOpen className="h-10 w-10 text-[#80368D]/60" /> : <Heart className="h-10 w-10 text-[#80368D]/60" />}
          </div>
          <h3 className="mt-6 text-xl font-bold text-[#1A1F2B]">
            {activeCollection ? "Collection vide" : "Aucun favori"}
          </h3>
          <p className="mt-2 text-muted-foreground max-w-md">
            {activeCollection
              ? "Cette collection ne contient pas encore de campagne. Ajoutez-en depuis la bibliothèque."
              : "Vous n'avez pas encore de favoris. Explorez la bibliothèque et cliquez sur le \u2764\uFE0F pour sauvegarder vos campagnes préférées."}
          </p>
          <Link href="/dashboard" className="mt-6">
            <Button className="bg-[#80368D] hover:bg-[#6b2d78]">
              <ArrowLeft className="h-4 w-4 mr-2" />Explorer la bibliothèque
            </Button>
          </Link>
        </div>
      )
    }

    return (
      <>
        <p className="text-sm text-muted-foreground mb-6">
          <BookmarkCheck className="h-4 w-4 inline mr-1" />
          {filteredCampaigns.length} campagne{filteredCampaigns.length > 1 ? 's' : ''} sauvegardée{filteredCampaigns.length > 1 ? 's' : ''}
          {activeCollection && collections.find(c => c.id === activeCollection) && (
            <span className="ml-1">dans « {collections.find(c => c.id === activeCollection)?.name} »</span>
          )}
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((fav) => {
            const c = fav.campaign!
            const isRemoving = removingId === fav.campaign_id
            return (
              <div key={fav.id} className={cn(
                "group relative overflow-hidden rounded-xl border border-[#D0E4F2] bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1",
                isRemoving && "opacity-50 scale-95"
              )}>
                <Link href={`/content/${c.slug || c.id}`}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#0A1F44] to-[#1a3a6e]">
                    {c.thumbnail ? (
                      <Image src={getGoogleDriveImageUrl(c.thumbnail)} alt={c.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-3xl font-bold text-white/20">{c.title.substring(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    {c.platforms?.[0] && (
                      <div className="absolute right-2 top-2">
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#1A1F2B] shadow-sm backdrop-blur-sm">{c.platforms[0]}</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/content/${c.slug || c.id}`}>
                    <h3 className="font-bold text-[#1A1F2B] line-clamp-2 hover:text-[#80368D] transition-colors">{c.title}</h3>
                  </Link>
                  {c.description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.category && <span className="rounded-full bg-[#80368D]/10 px-2.5 py-0.5 text-xs font-medium text-[#80368D]">{c.category}</span>}
                    {c.format && <span className="rounded-full bg-[#D0E4F2] px-2.5 py-0.5 text-xs font-medium text-[#1A1F2B]/70">{c.format}</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#D0E4F2] pt-3">
                    <Link href={`/content/${c.slug || c.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-[#80368D] hover:bg-[#80368D]/10">Voir détails →</Button>
                    </Link>
                    <div className="flex items-center gap-1">
                      {/* Bouton ajouter à une collection */}
                      {isPaid && collections.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            title="Ajouter à une collection"
                            onClick={() => setAddToCollectionCampaignId(
                              addToCollectionCampaignId === fav.campaign_id ? null : fav.campaign_id
                            )}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[#80368D] hover:bg-[#80368D]/10 transition-colors"
                          >
                            <FolderInput className="h-3.5 w-3.5" />
                          </button>
                          {/* Dropdown de sélection de collection */}
                          {addToCollectionCampaignId === fav.campaign_id && (
                            <div className="absolute right-0 bottom-full mb-1 z-50 w-48 rounded-lg border border-[#D0E4F2] bg-white shadow-lg py-1">
                              <p className="px-3 py-1.5 text-xs font-semibold text-[#1A1F2B]/60">Ajouter à...</p>
                              {collections.map((col) => {
                                const isInCollection = col.campaign_ids.includes(fav.campaign_id)
                                return (
                                  <button
                                    key={col.id}
                                    type="button"
                                    onClick={() => isInCollection
                                      ? removeFromCollection(col.id, fav.campaign_id)
                                      : addToCollection(col.id, fav.campaign_id)
                                    }
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left",
                                      isInCollection
                                        ? "bg-[#80368D]/10 text-[#80368D] font-semibold"
                                        : "text-[#1A1F2B] hover:bg-[#D0E4F2]/50"
                                    )}
                                  >
                                    <FolderOpen className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{col.name}</span>
                                    {isInCollection && <span className="ml-auto text-[10px]">✓</span>}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Bouton retirer des favoris */}
                      {activeCollection ? (
                        <button type="button" onClick={() => removeFromCollection(activeCollection, fav.campaign_id)} disabled={isRemoving}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50">
                          <FolderOpen className="h-3.5 w-3.5" />Retirer
                        </button>
                      ) : (
                        <button type="button" onClick={() => handleRemove(fav.campaign_id)} disabled={isRemoving}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" />Retirer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F8FB]">
      {isAuthenticated ? <DashboardNavbar /> : <Navbar />}
      {/* Modal de partage réseaux sociaux */}
      <Dialog open={!!shareModalCollection} onOpenChange={(open) => !open && setShareModalCollection(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-[#80368D]" />
              Partager « {shareModalCollection?.name} »
            </DialogTitle>
          </DialogHeader>
          {shareModalCollection?.share_token && (() => {
            const shareUrl = typeof window !== 'undefined'
              ? `${window.location.origin}/shared/${shareModalCollection.share_token}`
              : `/shared/${shareModalCollection.share_token}`
            const shareText = `Découvrez ma collection « ${shareModalCollection.name} » sur Big Five Creative Library !`
            const encodedUrl = encodeURIComponent(shareUrl)
            const encodedText = encodeURIComponent(shareText)

            const socials = [
              {
                name: 'WhatsApp',
                href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
                bg: 'bg-[#25D366] hover:bg-[#1ebe57]',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                ),
              },
              {
                name: 'X / Twitter',
                href: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
                bg: 'bg-black hover:bg-zinc-800',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                ),
              },
              {
                name: 'Facebook',
                href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
                bg: 'bg-[#1877F2] hover:bg-[#166fe5]',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                ),
              },
              {
                name: 'LinkedIn',
                href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
                bg: 'bg-[#0A66C2] hover:bg-[#0958a8]',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                ),
              },
            ]

            return (
              <div className="space-y-4 pt-2">
                {/* Boutons réseaux sociaux */}
                <div className="grid grid-cols-2 gap-3">
                  {socials.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-100",
                        s.bg
                      )}
                    >
                      {s.icon}
                      {s.name}
                    </a>
                  ))}
                </div>

                {/* Séparateur */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#D0E4F2]" /></div>
                  <div className="relative flex justify-center text-xs text-muted-foreground">
                    <span className="bg-white px-2">ou copier le lien</span>
                  </div>
                </div>

                {/* Champ lien + copie */}
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-lg border border-[#D0E4F2] bg-[#F4F8FB] px-3 py-2 text-xs text-[#1A1F2B] outline-none select-all"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Lien copié !"); setShareModalCollection(null) }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#80368D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6b2d78] transition-colors"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Copier
                  </button>
                </div>

                {/* Révoquer */}
                {shareModalCollection.is_shared && (
                  <button
                    type="button"
                    onClick={() => { revokeShare(shareModalCollection.id); setShareModalCollection(null) }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors pt-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Révoquer le lien public
                  </button>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <main className="flex-1">
        <div className="container mx-auto px-4 pb-12 pt-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ${
                activeTab === 'collections'
                  ? 'bg-gradient-to-br from-[#80368D] to-[#29358B] shadow-[#80368D]/20'
                  : 'bg-gradient-to-br from-red-500 to-pink-500 shadow-red-500/20'
              }`}>
                {activeTab === 'collections'
                  ? <FolderOpen className="h-5 w-5 text-white" />
                  : <Heart className="h-5 w-5 text-white fill-white" />
                }
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#1A1F2B]">
                {activeTab === 'collections' ? 'Mes Collections' : 'Mes Favoris'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {activeTab === 'collections'
                ? 'Organisez vos campagnes favorites dans des collections thématiques.'
                : 'Retrouvez toutes les campagnes que vous avez sauvegardées.'}
            </p>

            {/* Onglets */}
            <div className="mt-4 flex gap-1 rounded-lg bg-[#D0E4F2]/40 p-1 w-fit">
              <button
                type="button"
                onClick={() => router.push('/favorites')}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all",
                  activeTab === 'favorites'
                    ? "bg-white text-[#1A1F2B] shadow-sm"
                    : "text-[#1A1F2B]/60 hover:text-[#1A1F2B]"
                )}
              >
                <Heart className="h-3.5 w-3.5" />
                Favoris
                <span className="ml-1 text-xs opacity-60">{campaigns.length}</span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/favorites?tab=collections')}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all",
                  activeTab === 'collections'
                    ? "bg-white text-[#1A1F2B] shadow-sm"
                    : "text-[#1A1F2B]/60 hover:text-[#1A1F2B]"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Collections
                {isPaid && <span className="ml-1 text-xs opacity-60">{collections.length}</span>}
                {!isPaid && <Lock className="h-3 w-3 ml-1 opacity-40" />}
              </button>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar collections (visible seulement sur l'onglet Collections) */}
            <aside className={cn("hidden w-56 shrink-0 lg:block", activeTab !== 'collections' && "!hidden")}>
              <div className="sticky top-20 space-y-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1F2B]/60 mb-3">Collections</h2>
                <button type="button" onClick={() => setActiveCollection(null)}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    activeCollection === null ? "bg-[#80368D] text-white shadow-md" : "bg-white border border-[#D0E4F2] text-[#1A1F2B] hover:border-[#80368D]/30"
                  }`}>
                  <FolderOpen className="h-4 w-4" />
                  Tous les favoris
                  <span className="ml-auto text-xs opacity-70">{campaigns.length}</span>
                </button>

                {isPaid ? (
                  <>
                    {collections.map((col) => (
                      <div key={col.id} className="relative">
                        {editingCollectionId === col.id ? (
                          <div className="rounded-lg border border-[#80368D]/30 p-2 bg-white">
                            <input type="text" placeholder="Nom de la collection" value={editingCollectionName} onChange={(e) => setEditingCollectionName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') renameCollection(col.id, editingCollectionName); if (e.key === 'Escape') setEditingCollectionId(null) }}
                              className="w-full text-sm border-none outline-none bg-transparent text-[#1A1F2B]" autoFocus />
                            <div className="mt-1 flex gap-1">
                              <Button size="sm" className="h-6 text-xs bg-[#80368D] hover:bg-[#80368D]/90"
                                onClick={() => renameCollection(col.id, editingCollectionName)}>OK</Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs"
                                onClick={() => setEditingCollectionId(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button type="button" onClick={() => setActiveCollection(col.id)}
                              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                                activeCollection === col.id ? "bg-[#80368D] text-white shadow-md" : "bg-white border border-[#D0E4F2] text-[#1A1F2B] hover:border-[#80368D]/30"
                              }`}>
                              {col.is_shared ? (
                                <Globe className="h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <FolderOpen className="h-4 w-4 shrink-0" />
                              )}
                              <span className="truncate flex-1 text-left">{col.name}</span>
                              <span className="text-xs opacity-70 shrink-0">{col.item_count}</span>
                            </button>
                            {/* Actions panel (visible quand la collection est active) */}
                            {activeCollection === col.id && (
                              <div className="mt-1 rounded-lg border border-[#D0E4F2] bg-white p-2 space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => { setEditingCollectionId(col.id); setEditingCollectionName(col.name) }}
                                  className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-[#1A1F2B] hover:bg-[#D0E4F2]/50 transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />Renommer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openShareModal(col)}
                                  disabled={sharingCollectionId === col.id}
                                  className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-[#80368D] hover:bg-[#80368D]/10 transition-colors disabled:opacity-50"
                                >
                                  {sharingCollectionId === col.id ? (
                                    <><Loader2 className="h-3 w-3 animate-spin" />Activation...</>
                                  ) : (
                                    <><Share2 className="h-3 w-3" />Partager</>
                                  )}
                                </button>
                                {col.is_shared && (
                                  <button
                                    type="button"
                                    onClick={() => revokeShare(col.id)}
                                    className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-orange-500 hover:bg-orange-50 transition-colors"
                                  >
                                    <XCircle className="h-3 w-3" />Révoquer le partage
                                  </button>
                                )}
                                <div className="border-t border-[#D0E4F2] my-1" />
                                <button
                                  type="button"
                                  onClick={() => deleteCollection(col.id)}
                                  className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />Supprimer
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}

                    {showNewCollectionInput ? (
                      <div className="rounded-lg border border-[#80368D]/30 p-3 bg-white">
                        <input type="text" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                          placeholder="Nom de la collection"
                          aria-label="Nom de la collection"
                          className="w-full text-sm border-none outline-none bg-transparent text-[#1A1F2B] placeholder:text-[#1A1F2B]/40" autoFocus />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" className="h-7 text-xs bg-[#80368D] hover:bg-[#80368D]/90"
                            onClick={createCollection} disabled={creatingCollection || !newCollectionName.trim()}>
                            {creatingCollection ? <Loader2 className="h-3 w-3 animate-spin" /> : "Créer"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => { setShowNewCollectionInput(false); setNewCollectionName("") }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowCollectionModal(true)}
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[#80368D] border border-dashed border-[#80368D]/30 hover:bg-[#80368D]/5 transition-all">
                        <FolderPlus className="h-4 w-4" />+ Nouvelle collection
                      </button>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-[#D0E4F2] bg-white p-4 text-center">
                    <Lock className="h-6 w-6 text-[#1A1F2B]/30 mx-auto mb-2" />
                    <p className="text-xs text-[#1A1F2B]/60 mb-3">Collections disponibles avec Basic ou Pro</p>
                    <Link href="/pricing">
                      <Button size="sm" className="h-7 text-xs bg-[#80368D] hover:bg-[#80368D]/90">Voir les plans</Button>
                    </Link>
                  </div>
                )}
              </div>
            </aside>

            <div className="flex-1">
              {activeTab === 'collections' && activeCollection && isPaid ? (
              /* Vue campagnes d'une collection spécifique */
              <>
                <div className="flex items-center gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveCollection(null)}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#80368D] hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Mes collections
                  </button>
                  <span className="text-[#1A1F2B]/30">/</span>
                  <span className="text-sm font-semibold text-[#1A1F2B]">
                    {collections.find(c => c.id === activeCollection)?.name}
                  </span>
                </div>
                {renderContent()}
              </>
            ) : activeTab === 'collections' && !activeCollection && isPaid ? (
                /* Vue grille des collections */
                <div>
                  <p className="text-sm text-muted-foreground mb-6">
                    <FolderOpen className="h-4 w-4 inline mr-1" />
                    {collections.length} collection{collections.length > 1 ? 's' : ''}
                  </p>
                  {collections.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0E4F2] bg-gradient-to-br from-[#f8fafc] to-[#f0f4ff] p-8 text-center">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#80368D]/10">
                        <FolderOpen className="h-10 w-10 text-[#80368D]/60" />
                      </div>
                      <h3 className="mt-6 text-xl font-bold text-[#1A1F2B]">Aucune collection</h3>
                      <p className="mt-2 text-muted-foreground max-w-md">
                        Créez votre première collection pour organiser vos campagnes favorites par thème.
                      </p>
                      <Button className="mt-6 bg-[#80368D] hover:bg-[#6b2d78]" onClick={() => setShowCollectionModal(true)}>
                        <FolderPlus className="h-4 w-4 mr-2" />Créer une collection
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {collections.map((col) => (
                        <div
                          key={col.id}
                          className="relative rounded-xl border border-[#D0E4F2] bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-[#80368D]/30 cursor-pointer"
                          onClick={() => setActiveCollection(col.id)}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#80368D]/10 shrink-0">
                              {col.is_shared ? <Globe className="h-5 w-5 text-emerald-500" /> : <FolderOpen className="h-5 w-5 text-[#80368D]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-[#1A1F2B] truncate">{col.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {col.item_count} campagne{col.item_count > 1 ? 's' : ''}
                                {col.is_shared && <span className="ml-1.5 text-emerald-500">· Partagé</span>}
                              </p>
                            </div>
                          </div>
                          {/* Preview thumbnails 2×2 */}
                          <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden h-24 bg-[#D0E4F2]/30">
                            {(collectionThumbnails[col.id] || []).slice(0, 4).map((thumb, idx) => (
                              <div key={idx} className="relative overflow-hidden">
                                <Image src={getGoogleDriveImageUrl(thumb)} alt="" fill className="object-cover" />
                              </div>
                            ))}
                            {Array.from({ length: Math.max(0, 4 - (collectionThumbnails[col.id]?.length || 0)) }).map((_, idx) => (
                              <div key={`empty-${idx}`} className="bg-[#D0E4F2]/50" />
                            ))}
                          </div>
                          {/* Actions */}
                          <div className="mt-3 flex items-center gap-1 border-t border-[#D0E4F2] pt-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); const n = prompt('Nouveau nom', col.name); if (n && n.trim() && n.trim() !== col.name) renameCollection(col.id, n) }}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#1A1F2B]/60 hover:text-[#1A1F2B] hover:bg-[#D0E4F2]/50 transition-colors"
                            >
                              <Pencil className="h-3 w-3" />Renommer
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openShareModal(col) }}
                              disabled={sharingCollectionId === col.id}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#80368D] hover:bg-[#80368D]/10 transition-colors disabled:opacity-50"
                            >
                              {sharingCollectionId === col.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                              Partager
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={(e) => { e.stopPropagation(); deleteCollection(col.id) }}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-500/60 hover:text-red-500 hover:bg-red-50 transition-colors ml-auto"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {/* Bouton nouvelle collection */}
                      <button
                        type="button"
                        onClick={() => setShowCollectionModal(true)}
                        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#80368D]/30 bg-white/50 p-5 text-center transition-all hover:bg-[#80368D]/5 hover:border-[#80368D]/50 min-h-[160px]"
                      >
                        <FolderPlus className="h-8 w-8 text-[#80368D]/40 mb-2" />
                        <span className="text-sm font-medium text-[#80368D]">Nouvelle collection</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : activeTab === 'collections' && !isPaid ? (
                /* Collections bloqué pour Free */
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0E4F2] bg-gradient-to-br from-[#f8fafc] to-[#f0f4ff] p-8 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#80368D]/10">
                    <Lock className="h-10 w-10 text-[#80368D]/60" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-[#1A1F2B]">Fonctionnalité Premium</h3>
                  <p className="mt-2 text-muted-foreground max-w-md">
                    Les collections vous permettent d&apos;organiser vos campagnes favorites dans des collections thématiques et de les partager.
                  </p>
                  <Link href="/pricing" className="mt-6">
                    <Button className="bg-[#80368D] hover:bg-[#6b2d78]">
                      <Sparkles className="h-4 w-4 mr-2" />Voir les plans
                    </Button>
                  </Link>
                </div>
              ) : (
                renderContent()
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Modal de création de collection */}
      <CollectionModal
        open={showCollectionModal}
        onOpenChange={setShowCollectionModal}
        onSave={handleCollectionModalSave}
      />
    </div>
  )
}

export default function FavoritesPage() {
  return (
    <Suspense>
      <FavoritesPageContent />
    </Suspense>
  )
}
