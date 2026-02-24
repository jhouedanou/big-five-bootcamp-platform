'use client'

import { useEffect, useState } from "react"
import { useFavorites } from "@/hooks/use-favorites"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, LogIn, Trash2, BookmarkCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import Image from "next/image"
import { cn, getGoogleDriveImageUrl } from "@/lib/utils"

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

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted && isAuthenticated) {
            fetchFavoritesWithCampaigns()
        }
    }, [mounted, isAuthenticated, fetchFavoritesWithCampaigns])

    const campaigns = mounted && isAuthenticated && !loading && !error
        ? favoritesWithCampaigns.filter(f => f.campaign)
        : []

    const handleRemove = async (campaignId: string) => {
        setRemovingId(campaignId)
        await removeFavorite(campaignId)
        setRemovingId(null)
    }

    const renderContent = () => {
        // Hydratation ou chargement
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

        // Non connecté
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
                                <LogIn className="h-4 w-4 mr-2" />
                                Se connecter
                            </Button>
                        </Link>
                        <Link href="/register?redirect=/favorites">
                            <Button variant="outline">
                                Créer un compte
                            </Button>
                        </Link>
                    </div>
                </div>
            )
        }

        // Erreur
        if (error) {
            return (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 dark:bg-red-950/20 p-8 text-center">
                    <h3 className="text-lg font-semibold text-red-600">Erreur</h3>
                    <p className="mt-2 text-muted-foreground">{error}</p>
                    <Button onClick={() => fetchFavoritesWithCampaigns()} className="mt-4" variant="outline">
                        Réessayer
                    </Button>
                </div>
            )
        }

        // Aucun favori
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
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Explorer la bibliothèque
                        </Button>
                    </Link>
                </div>
            )
        }

        // Campagnes favorites
        return (
            <>
                <p className="text-sm text-muted-foreground mb-6">
                    <BookmarkCheck className="h-4 w-4 inline mr-1" />
                    {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''} sauvegardée{campaigns.length > 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map((fav) => {
                        const c = fav.campaign!
                        const isRemoving = removingId === fav.campaign_id
                        return (
                            <div
                                key={fav.id}
                                className={cn(
                                    "group relative overflow-hidden rounded-xl border border-[#D0E4F2] bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1",
                                    isRemoving && "opacity-50 scale-95"
                                )}
                            >
                                {/* Image */}
                                <Link href={`/content/${c.id}`}>
                                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#0A1F44] to-[#1a3a6e]">
                                        {c.thumbnail ? (
                                            <Image
                                                src={getGoogleDriveImageUrl(c.thumbnail)}
                                                alt={c.title}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <span className="text-3xl font-bold text-white/20">
                                                    {c.title.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                                        
                                        {/* Platform badge */}
                                        {c.platforms?.[0] && (
                                            <div className="absolute right-2 top-2">
                                                <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#1A1F2B] shadow-sm backdrop-blur-sm">
                                                    {c.platforms[0]}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                {/* Content */}
                                <div className="p-4">
                                    <Link href={`/content/${c.id}`}>
                                        <h3 className="font-bold text-[#1A1F2B] line-clamp-2 hover:text-[#80368D] transition-colors">
                                            {c.title}
                                        </h3>
                                    </Link>
                                    
                                    {c.description && (
                                        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                                            {c.description}
                                        </p>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {c.category && (
                                            <span className="rounded-full bg-[#80368D]/10 px-2.5 py-0.5 text-xs font-medium text-[#80368D]">
                                                {c.category}
                                            </span>
                                        )}
                                        {c.format && (
                                            <span className="rounded-full bg-[#D0E4F2] px-2.5 py-0.5 text-xs font-medium text-[#1A1F2B]/70">
                                                {c.format}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-4 flex items-center justify-between border-t border-[#D0E4F2] pt-3">
                                        <Link href={`/content/${c.id}`}>
                                            <Button variant="ghost" size="sm" className="text-xs text-[#80368D] hover:bg-[#80368D]/10">
                                                Voir détails →
                                            </Button>
                                        </Link>
                                        <button
                                            onClick={() => handleRemove(fav.campaign_id)}
                                            disabled={isRemoving}
                                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                            title="Retirer des favoris"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Retirer
                                        </button>
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
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/20">
                                <Heart className="h-5 w-5 text-white fill-white" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-[#1A1F2B]">
                                Mes Favoris
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Retrouvez toutes les campagnes que vous avez sauvegardées.
                        </p>
                    </div>

                    {renderContent()}
                </div>
            </main>
            <Footer />
        </div>
    )
}
