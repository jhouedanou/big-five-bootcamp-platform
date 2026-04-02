'use client'

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, Maximize2, Heart, ExternalLink } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useFavorites } from "@/hooks/use-favorites"
import { useState } from "react"
import { cn, getGoogleDriveImageUrl } from "@/lib/utils"

// Détecte la plateforme vidéo
function getVideoPlatform(url: string): 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'other' {
    if (!url) return 'other';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    return 'other';
}

// Helper function pour générer l'URL d'embed correcte (YouTube et TikTok seulement)
function getVideoEmbedUrl(url: string): string | null {
    if (!url) return null;
    
    // YouTube - fonctionne bien en embed
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const watchMatch = url.match(/[?&]v=([^&]+)/);
        if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
        
        const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
        if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
        
        if (url.includes('/embed/')) return url;
        return url;
    }
    
    // TikTok - fonctionne en embed
    if (url.includes('tiktok.com')) {
        const match = url.match(/\/video\/(\d+)/);
        if (match) {
            return `https://www.tiktok.com/embed/v2/${match[1]}`;
        }
    }
    
    // Facebook et Instagram - ne fonctionnent pas bien en embed, retourner null
    if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('instagram.com')) {
        return null;
    }
    
    return url;
}

// Obtenir le label de la plateforme
function getPlatformLabel(platform: string): string {
    const labels: Record<string, string> = {
        'youtube': 'YouTube',
        'facebook': 'Facebook',
        'instagram': 'Instagram',
        'tiktok': 'TikTok',
        'other': 'Vidéo'
    };
    return labels[platform] || 'Vidéo';
}

interface Creative {
    id: string
    title: string
    thumbnail: string
    platform: string
    format: string
    sector: string
    objective: string
    videoUrl?: string | null
    whyItWorks?: string | null
    howToUse?: string | null
}

interface CreativeCardProps {
    creative: Creative
    showFavoriteButton?: boolean
}

export function CreativeCard({ creative, showFavoriteButton = true }: CreativeCardProps) {
    const { isFavorite, toggleFavorite, isAuthenticated, loading } = useFavorites()
    const [isToggling, setIsToggling] = useState(false)
    const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false)
    
    const isCurrentFavorite = isFavorite(creative.id)
    
    // Déterminer si c'est une vidéo Facebook/Instagram
    const videoPlatform = creative.videoUrl ? getVideoPlatform(creative.videoUrl) : null
    const needsPopup = videoPlatform === 'facebook' || videoPlatform === 'instagram'

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (!isAuthenticated) {
            // Rediriger vers la page de connexion
            window.location.href = '/login?redirect=/library'
            return
        }
        
        setIsToggling(true)
        await toggleFavorite(creative.id)
        setIsToggling(false)
    }

    return (
        <>
        <Dialog>
            <DialogTrigger asChild>
                <div className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/5] overflow-hidden">
                        <Image
                            src={getGoogleDriveImageUrl(creative.thumbnail) || "/placeholder.svg"}
                            alt={creative.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />

                        {/* Play Icon if video */}
                        {creative.videoUrl && (
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                                <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
                            </div>
                        )}

                        {/* Favorite Button */}
                        {showFavoriteButton && (
                            <button
                                onClick={handleToggleFavorite}
                                disabled={isToggling || loading}
                                className={cn(
                                    "absolute right-2 top-2 z-10 p-2 rounded-full transition-all duration-200",
                                    "bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm",
                                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                                    isToggling && "opacity-50 cursor-wait"
                                )}
                                title={isCurrentFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                                <Heart 
                                    className={cn(
                                        "h-5 w-5 transition-colors",
                                        isCurrentFavorite 
                                            ? "fill-red-500 text-red-500" 
                                            : "text-gray-600 hover:text-red-500"
                                    )}
                                />
                            </button>
                        )}

                        {/* Badges */}
                        <div className="absolute left-2 top-2 flex flex-col gap-1">
                            <Badge variant="secondary" className="bg-white/90 text-black shadow-sm backdrop-blur-sm">
                                {creative.platform}
                            </Badge>
                            {creative.format === 'Vidéo' && (
                                <Badge variant="secondary" className="bg-black/70 text-white shadow-sm backdrop-blur-sm">
                                    Vidéo
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <h3 className="font-semibold leading-tight text-foreground line-clamp-1">{creative.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                            <span className="rounded-full border px-2 py-0.5">{creative.sector}</span>
                            <span className="rounded-full border px-2 py-0.5">{creative.objective}</span>
                        </div>
                    </div>
                </div>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle>{creative.title}</DialogTitle>
                            <DialogDescription>
                                {creative.sector} • {creative.objective} • {creative.platform}
                            </DialogDescription>
                        </div>
                        {showFavoriteButton && (
                            <button
                                onClick={handleToggleFavorite}
                                disabled={isToggling || loading}
                                className={cn(
                                    "p-2 rounded-full transition-all duration-200",
                                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                                    isToggling && "opacity-50 cursor-wait"
                                )}
                                title={isCurrentFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                                <Heart 
                                    className={cn(
                                        "h-6 w-6 transition-colors",
                                        isCurrentFavorite 
                                            ? "fill-red-500 text-red-500" 
                                            : "text-gray-600 hover:text-red-500"
                                    )}
                                />
                            </button>
                        )}
                    </div>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-2 mt-4">
                    {/* Media Column */}
                    <div className="relative w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center min-h-[300px]">
                        {creative.videoUrl ? (
                            (() => {
                                const embedUrl = getVideoEmbedUrl(creative.videoUrl);
                                const platform = getVideoPlatform(creative.videoUrl);
                                
                                // Si on peut embed (YouTube, TikTok)
                                if (embedUrl) {
                                    return (
                                        <div className="relative w-full aspect-[9/16] max-h-[500px]">
                                            <iframe
                                                src={embedUrl}
                                                className="absolute inset-0 h-full w-full"
                                                title={`Vidéo: ${creative.title}`}
                                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                                allowFullScreen
                                            />
                                        </div>
                                    );
                                }
                                
                                // Pour Facebook/Instagram - afficher le visuel avec bouton popup
                                return (
                                    <div className="relative w-full h-full min-h-[400px] flex flex-col items-center justify-center p-4">
                                        {/* Visuel/Thumbnail plein écran */}
                                        <div 
                                            className="relative w-full h-80 cursor-pointer group"
                                            onClick={() => setIsVideoPopupOpen(true)}
                                        >
                                            <Image
                                                src={getGoogleDriveImageUrl(creative.thumbnail) || "/placeholder.jpg"}
                                                alt={creative.title}
                                                fill
                                                className="object-contain rounded-lg"
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                            />
                                            {/* Overlay play button */}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover:bg-black/40 transition-colors">
                                                <div className="bg-white/90 rounded-full p-4 shadow-lg group-hover:scale-110 transition-transform">
                                                    <PlayCircle className="h-12 w-12 text-violet-600" />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Texte d'indication */}
                                        <p className="text-sm text-muted-foreground mt-4 text-center">
                                            Cliquez pour voir la vidéo {getPlatformLabel(platform)}
                                        </p>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="relative w-full h-full min-h-[400px]">
                                <Image
                                    src={getGoogleDriveImageUrl(creative.thumbnail) || "/placeholder.jpg"}
                                    alt={creative.title}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            </div>
                        )}
                    </div>

                    {/* Details Column */}
                    <div className="space-y-6">
                        {creative.whyItWorks && (
                            <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
                                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                                    <Maximize2 className="h-4 w-4" />
                                    Pourquoi ça marche ?
                                </h4>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {creative.whyItWorks}
                                </p>
                            </div>
                        )}

                        {creative.howToUse && (
                            <div className="rounded-lg bg-orange-500/5 p-4 border border-orange-500/10">
                                <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                                    🎯 Comment l'utiliser ?
                                </h4>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {creative.howToUse}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <Button 
                                variant="outline"
                                className="flex-1"
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleToggleFavorite(e)
                                }}
                            >
                                <Heart 
                                    className={cn(
                                        "h-4 w-4 mr-2",
                                        isCurrentFavorite && "fill-red-500 text-red-500"
                                    )}
                                />
                                {isCurrentFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                            </Button>
                            <Button className="flex-1">
                                Télécharger / S'inspirer
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Popup pour les vidéos Facebook/Instagram */}
        {needsPopup && creative.videoUrl && (
            <Dialog open={isVideoPopupOpen} onOpenChange={setIsVideoPopupOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden">
                    <div className="relative">
                        {/* Grande image/visuel */}
                        <div className="relative w-full aspect-[9/16] max-h-[80vh] bg-black">
                            <Image
                                src={getGoogleDriveImageUrl(creative.thumbnail) || "/placeholder.jpg"}
                                alt={creative.title}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 672px"
                                priority
                            />
                        </div>
                        
                        {/* Barre d'action en bas */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pt-16">
                            <h3 className="text-white font-semibold text-lg mb-3 line-clamp-2">
                                {creative.title}
                            </h3>
                            
                            <div className="flex gap-3">
                                <a
                                    href={creative.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
                                >
                                    <PlayCircle className="h-5 w-5" />
                                    Voir la vidéo sur {getPlatformLabel(videoPlatform!)}
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                            
                            <p className="text-white/60 text-xs mt-3 text-center">
                                La vidéo s'ouvrira sur {getPlatformLabel(videoPlatform!)} dans un nouvel onglet
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )}
    </>
    )
}
