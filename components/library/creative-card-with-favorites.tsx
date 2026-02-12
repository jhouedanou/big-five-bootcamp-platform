'use client'

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, Maximize2, Heart } from "lucide-react"
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
import { cn } from "@/lib/utils"

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
    
    const isCurrentFavorite = isFavorite(creative.id)

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
        <Dialog>
            <DialogTrigger asChild>
                <div className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/5] overflow-hidden">
                        <Image
                            src={creative.thumbnail || "/placeholder.png"}
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
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        {creative.videoUrl ? (
                            <iframe
                                src={creative.videoUrl.replace('watch?v=', 'embed/')}
                                className="absolute inset-0 h-full w-full"
                                title={`Vidéo: ${creative.title}`}
                                allowFullScreen
                            />
                        ) : (
                            <Image
                                src={creative.thumbnail || "/placeholder.jpg"}
                                alt={creative.title}
                                fill
                                className="object-contain"
                            />
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
    )
}
