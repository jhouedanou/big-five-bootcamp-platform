'use client'

import { useEffect, useState } from "react"
import { useFavorites } from "@/hooks/use-favorites"
import { CreativeCard } from "@/components/library/creative-card-with-favorites"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, LogIn } from "lucide-react"
import Link from "next/link"

export default function FavoritesPage() {
    const { 
        favoritesWithCampaigns, 
        fetchFavoritesWithCampaigns, 
        loading, 
        isAuthenticated,
        error 
    } = useFavorites()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted && isAuthenticated) {
            fetchFavoritesWithCampaigns()
        }
    }, [mounted, isAuthenticated, fetchFavoritesWithCampaigns])

    // Éviter les problèmes d'hydratation
    if (!mounted) {
        return (
            <div className="container mx-auto min-h-screen px-4 pb-12 pt-6">
                <div className="mb-8 space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        Mes Favoris
                    </h1>
                </div>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    // Non connecté
    if (!isAuthenticated) {
        return (
            <div className="container mx-auto min-h-screen px-4 pb-12 pt-6">
                <div className="mb-8 space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        Mes Favoris
                    </h1>
                </div>
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <LogIn className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Connexion requise</h3>
                    <p className="mt-2 text-muted-foreground max-w-md">
                        Connectez-vous pour accéder à vos favoris et sauvegarder vos publicités préférées.
                    </p>
                    <div className="mt-6 flex gap-4">
                        <Link href="/login?redirect=/favorites">
                            <Button>
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
            </div>
        )
    }

    // Chargement
    if (loading) {
        return (
            <div className="container mx-auto min-h-screen px-4 pb-12 pt-6">
                <div className="mb-8 space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        Mes Favoris
                    </h1>
                </div>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    // Erreur
    if (error) {
        return (
            <div className="container mx-auto min-h-screen px-4 pb-12 pt-6">
                <div className="mb-8 space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        Mes Favoris
                    </h1>
                </div>
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-red-50 dark:bg-red-950/20 p-8 text-center">
                    <h3 className="text-lg font-semibold text-red-600">Erreur</h3>
                    <p className="mt-2 text-muted-foreground">{error}</p>
                    <Button onClick={() => fetchFavoritesWithCampaigns()} className="mt-4">
                        Réessayer
                    </Button>
                </div>
            </div>
        )
    }

    // Convertir les favoris en format CreativeCard
    const creatives = favoritesWithCampaigns
        .filter(f => f.campaign)
        .map(f => ({
            id: f.campaign!.id,
            title: f.campaign!.title,
            thumbnail: f.campaign!.thumbnail || '',
            platform: f.campaign!.platforms?.[0] || 'Facebook',
            format: f.campaign!.format || '',
            sector: f.campaign!.category || '',
            objective: '',
            whyItWorks: f.campaign!.description || null,
            howToUse: null,
        }))

    return (
        <div className="container mx-auto min-h-screen px-4 pb-12 pt-6">
            <div className="mb-8 space-y-4">
                <div className="flex items-center gap-3">
                    <Heart className="h-8 w-8 text-red-500 fill-red-500" />
                    <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        Mes Favoris
                    </h1>
                </div>
                <p className="max-w-2xl text-lg text-muted-foreground">
                    Retrouvez toutes les publicités que vous avez sauvegardées.
                </p>
            </div>

            <div className="mt-8">
                {creatives.length > 0 ? (
                    <>
                        <p className="text-sm text-muted-foreground mb-6">
                            {creatives.length} publicité{creatives.length > 1 ? 's' : ''} sauvegardée{creatives.length > 1 ? 's' : ''}
                        </p>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {creatives.map((creative) => (
                                <CreativeCard key={creative.id} creative={creative} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center animate-in fade-in-50">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Heart className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">Aucun favori</h3>
                        <p className="mt-2 text-muted-foreground max-w-md">
                            Vous n'avez pas encore de favoris. Explorez la bibliothèque et cliquez sur le cœur pour sauvegarder vos publicités préférées.
                        </p>
                        <Link href="/library" className="mt-6">
                            <Button>
                                Explorer la bibliothèque
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
