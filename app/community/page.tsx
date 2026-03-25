"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { 
  Users, Heart, Crown, Loader2, ArrowLeft, ChevronLeft, ChevronRight, 
  Calendar, Search, Eye, Sparkles 
} from "lucide-react"
import { getGoogleDriveImageUrl, fixBrokenEncoding } from "@/lib/utils"

interface UserProfile {
  id: string
  name: string
  initials: string
  plan: string
  joinedAt: string
  favoritesCount: number
}

interface FavoriteCampaign {
  id: string
  title: string
  thumbnail: string
  platforms: string[]
  category: string
  format: string
  brand: string
  country: string
  accessLevel: string
  addedAt: string
}

export default function CommunityPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")

  // Profil sélectionné pour voir les favoris
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [selectedUserFavorites, setSelectedUserFavorites] = useState<FavoriteCampaign[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)

  // Charger les profils
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/users/profiles?page=${currentPage}&limit=12`)
        const data = await res.json()
        setUsers(data.users || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      } catch {
        console.error('Erreur chargement profils')
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [currentPage])

  // Charger les favoris d'un utilisateur
  const loadUserFavorites = async (user: UserProfile) => {
    setSelectedUser(user)
    setLoadingFavorites(true)
    try {
      const res = await fetch(`/api/users/${user.id}/favorites`)
      const data = await res.json()
      setSelectedUserFavorites((data.favorites || []).map((f: FavoriteCampaign) => ({
        ...f,
        title: fixBrokenEncoding(f.title),
        brand: fixBrokenEncoding(f.brand),
        country: fixBrokenEncoding(f.country),
        category: fixBrokenEncoding(f.category),
      })))
    } catch {
      console.error('Erreur chargement favoris')
      setSelectedUserFavorites([])
    } finally {
      setLoadingFavorites(false)
    }
  }

  // Filtrer par nom
  const filteredUsers = searchQuery
    ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : users

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#80368D]/10 text-[#80368D]">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[#1A1F2B]">
                Communauté
              </h1>
            </div>
            <p className="text-[#1A1F2B]/60 max-w-2xl">
              Découvrez les marketeurs qui utilisent Big Five Creative Library et explorez les campagnes qu&apos;ils ont sauvegardées.
            </p>
            {total > 0 && (
              <p className="mt-2 text-sm text-[#1A1F2B]/50">
                {total} membre{total > 1 ? 's' : ''} inscrit{total > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Si un profil est sélectionné, afficher ses favoris */}
          {selectedUser ? (
            <div>
              {/* Header du profil */}
              <div className="mb-6">
                <button 
                  onClick={() => { setSelectedUser(null); setSelectedUserFavorites([]); }}
                  className="flex items-center gap-1 text-sm text-[#80368D] hover:text-[#80368D]/80 transition-colors mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la communauté
                </button>

                <div className="flex items-center gap-4 p-6 rounded-2xl border border-[#D0E4F2] bg-gradient-to-r from-[#D0E4F2]/20 to-white">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#80368D] to-[#29358B] text-xl font-bold text-white shadow-lg">
                    {selectedUser.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#1A1F2B]">{selectedUser.name}</h2>
                      {selectedUser.plan.toLowerCase() === 'premium' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 px-2 py-0.5 text-xs font-bold text-amber-900">
                          <Crown className="h-3 w-3" />
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#1A1F2B]/60">
                      <Calendar className="h-3.5 w-3.5 inline mr-1" />
                      Membre depuis {formatDate(selectedUser.joinedAt)}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#80368D]">{selectedUserFavorites.length}</div>
                    <div className="text-xs text-[#1A1F2B]/50">favori{selectedUserFavorites.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>

              {/* Favoris de l'utilisateur */}
              {loadingFavorites ? (
                <div className="flex items-center justify-center min-h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-[#80368D]" />
                </div>
              ) : selectedUserFavorites.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-[#1A1F2B] mb-4">
                    <Heart className="h-5 w-5 inline mr-2 text-red-500 fill-red-500" />
                    Campagnes favorites
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {selectedUserFavorites.map((campaign) => (
                      <Link 
                        key={campaign.id} 
                        href={`/content/${campaign.slug || campaign.id}`}
                        className="group rounded-xl border border-[#D0E4F2] bg-white overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className="aspect-video bg-[#D0E4F2]/30 relative overflow-hidden">
                          {campaign.thumbnail ? (
                            <img 
                              src={getGoogleDriveImageUrl(campaign.thumbnail)} 
                              alt={campaign.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#D0E4F2] to-[#D0E4F2]/50">
                              <Eye className="h-8 w-8 text-[#1A1F2B]/30" />
                            </div>
                          )}
                          {campaign.accessLevel === 'premium' && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900">
                              <Crown className="h-3 w-3" />
                              Premium
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="font-semibold text-sm text-[#1A1F2B] line-clamp-2">{campaign.title}</h4>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[#1A1F2B]/60">
                            {campaign.brand && <span>{campaign.brand}</span>}
                            {campaign.brand && campaign.country && <span>·</span>}
                            {campaign.country && <span>{campaign.country}</span>}
                          </div>
                          {campaign.category && (
                            <span className="mt-2 inline-block rounded-full bg-[#D0E4F2] px-2 py-0.5 text-xs text-[#1A1F2B]/70">
                              {campaign.category}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl border border-dashed border-[#D0E4F2] bg-[#D0E4F2]/10 p-8">
                  <Heart className="h-12 w-12 text-[#1A1F2B]/20 mb-3" />
                  <p className="text-[#1A1F2B]/50 text-center">
                    {selectedUser.name} n&apos;a pas encore de campagnes favorites.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Liste des profils */
            <div>
              {/* Barre de recherche */}
              <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1F2B]/40" />
                <input
                  type="text"
                  placeholder="Rechercher un membre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#D0E4F2] bg-white pl-10 pr-4 text-sm text-[#1A1F2B] outline-none placeholder:text-[#1A1F2B]/40 focus:border-[#80368D] focus:ring-2 focus:ring-[#80368D]/20 transition-colors"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-[#80368D]" />
                </div>
              ) : filteredUsers.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => loadUserFavorites(user)}
                        className="group text-left p-5 rounded-xl border border-[#D0E4F2] bg-white transition-all hover:shadow-lg hover:border-[#80368D]/30 hover:-translate-y-1"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#80368D] to-[#29358B] text-sm font-bold text-white shadow-md group-hover:shadow-lg transition-shadow">
                            {user.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-[#1A1F2B] truncate">{user.name}</h3>
                              {user.plan.toLowerCase() === 'premium' && (
                                <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-[#1A1F2B]/50">
                              Depuis {formatDate(user.joinedAt)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-[#D0E4F2]/50">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Heart className={`h-4 w-4 ${user.favoritesCount > 0 ? 'text-red-500 fill-red-500' : 'text-[#1A1F2B]/30'}`} />
                            <span className="text-[#1A1F2B]/70">
                              {user.favoritesCount} favori{user.favoritesCount > 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-xs text-[#80368D] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Voir le profil
                            <Eye className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="border-[#D0E4F2]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-[#1A1F2B]/60">
                        Page {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="border-[#D0E4F2]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-dashed border-[#D0E4F2] bg-[#D0E4F2]/10 p-8">
                  <Users className="h-12 w-12 text-[#1A1F2B]/20 mb-3" />
                  <p className="text-[#1A1F2B]/50">
                    {searchQuery ? 'Aucun membre trouvé pour cette recherche.' : 'Aucun membre pour le moment.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
