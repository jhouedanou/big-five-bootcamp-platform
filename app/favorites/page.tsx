'use client'

import { useEffect, useState, useCallback } from "react"
import { useFavorites } from "@/hooks/use-favorites"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, LogIn, Trash2, BookmarkCheck, ArrowLeft, FolderOpen, FolderPlus, X, Lock, Pencil, MoreVertical, FolderInput } from "lucide-react"
import Link from "next/link"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import Image from "next/image"
import { cn, getGoogleDriveImageUrl } from "@/lib/utils"
import { createClient } from "@/lib/supabase"
import { isPaidPlan } from "@/lib/pricing"

interface Collection {
  id: string
  name: string
  created_at: string
  item_count: number
  campaign_ids: string[]
}

export default function FavoritesPage() {
  const {
    favoritesWithCampaigns,
    fetchFavoritesWithCampaigns,
    removeFavorite,
    loading,
    isAuthenticated,
    error
  } = useFavorites()
  const [mounted, setMounted] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState("Free")
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeCollection, setActiveCollection] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false)
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [editingCollectionName, setEditingCollectionName] = useState("")
  const [addToCollectionCampaignId, setAddToCollectionCampaignId] = useState<string | null>(null)

  const supabase = createClient()
  const isPaid = isPaidPlan(userPlan)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchFavoritesWithCampaigns()
      loadUserPlan()
    }
  }, [mounted, isAuthenticated, fetchFavoritesWithCampaigns])

  const loadUserPlan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data: profile } = await supabase
        .from('users')
        .select('plan, subscription_status, trial_end_date')
        .eq('id', session.user.id)
        .single()
      if (profile) {
        const isTrial = profile.subscription_status === 'trial' &&
          profile.trial_end_date && new Date(profile.trial_end_date) > new Date()
        const effectivePlan = isTrial ? 'Pro' : (profile.plan || 'Free')
        setUserPlan(effectivePlan)
        if (isPaidPlan(effectivePlan)) {
          loadCollections(session.user.id)
        }
      }
    } catch { /* ignore */ }
  }

  const loadCollections = async (userId: string) => {
    try {
      const res = await fetch('/api/collections')
      if (res.ok) {
        const data = await res.json()
        setCollections(data.collections || [])
      }
    } catch { /* Table pas encore créée */ }
  }

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
      }
    } catch { /* ignore */ } finally { setCreatingCollection(false) }
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
      }
    } catch { /* ignore */ }
    setEditingCollectionId(null)
    setEditingCollectionName("")
  }

  const deleteCollection = async (id: string) => {
    if (!confirm('Supprimer cette collection ? Les favoris ne seront pas supprimés.')) return
    try {
      const res = await fetch(`/api/collections?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCollections(prev => prev.filter(c => c.id !== id))
        if (activeCollection === id) setActiveCollection(null)
      }
    } catch { /* ignore */ }
  }

  const addToCollection = async (collectionId: string, campaignId: string) => {
    try {
      const res = await fetch('/api/collections/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, campaignId }),
      })
      if (res.ok) {
        // Mettre à jour localement
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
      }
    } catch { /* ignore */ }
    setAddToCollectionCampaignId(null)
  }

  const removeFromCollection = async (collectionId: string, campaignId: string) => {
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
      }
    } catch { /* ignore */ }
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
    ? campaigns.filter(f => {
        const col = collections.find(c => c.id === activeCollection)
        return col?.campaign_ids?.includes(f.campaign_id)
      })
    : campaigns

  const renderContent = () => {
    if (!mounted || (isAuthenticated && loading)) {
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

    if (campaigns.length === 0) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0E4F2] bg-gradient-to-br from-[#f8fafc] to-[#f0f4ff] p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#D0E4F2]">
            <Heart className="h-10 w-10 text-[#80368D]/60" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-[#1A1F2B]">Aucun favori</h3>
          <p className="mt-2 text-muted-foreground max-w-md">
            Vous n&apos;avez pas encore de favoris. Explorez la bibliothèque et cliquez sur le ❤️ pour sauvegarder vos campagnes préférées.
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
                        <button onClick={() => removeFromCollection(activeCollection, fav.campaign_id)} disabled={isRemoving}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50">
                          <FolderOpen className="h-3.5 w-3.5" />Retirer
                        </button>
                      ) : (
                        <button onClick={() => handleRemove(fav.campaign_id)} disabled={isRemoving}
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
      <main className="flex-1">
        <div className="container mx-auto px-4 pb-12 pt-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/20">
                <Heart className="h-5 w-5 text-white fill-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#1A1F2B]">Mes Favoris</h1>
            </div>
            <p className="text-muted-foreground">Retrouvez toutes les campagnes que vous avez sauvegardées.</p>
          </div>

          <div className="flex gap-8">
            {/* Sidebar collections */}
            <aside className="hidden w-56 shrink-0 lg:block">
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
                      <div key={col.id} className="group relative">
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
                          <button type="button" onClick={() => setActiveCollection(col.id)}
                            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                              activeCollection === col.id ? "bg-[#80368D] text-white shadow-md" : "bg-white border border-[#D0E4F2] text-[#1A1F2B] hover:border-[#80368D]/30"
                            }`}>
                            <FolderOpen className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1 text-left">{col.name}</span>
                            <span className="text-xs opacity-70 shrink-0">{col.item_count}</span>
                          </button>
                        )}
                        {/* Menu contextuel (visible au hover) */}
                        {editingCollectionId !== col.id && (
                          <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
                            <button type="button" title="Renommer" onClick={(e) => { e.stopPropagation(); setEditingCollectionId(col.id); setEditingCollectionName(col.name) }}
                              className="rounded p-1 hover:bg-[#D0E4F2]/50 text-[#1A1F2B]/40 hover:text-[#1A1F2B]">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); deleteCollection(col.id) }}
                              className="rounded p-1 hover:bg-red-50 text-[#1A1F2B]/40 hover:text-red-500">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {showNewCollectionInput ? (
                      <div className="rounded-lg border border-[#80368D]/30 p-3 bg-white">
                        <input type="text" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                          placeholder="Nom de la collection"
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
                      <button type="button" onClick={() => setShowNewCollectionInput(true)}
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

            <div className="flex-1">{renderContent()}</div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
