"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Heart,
  Share2,
  ExternalLink,
  Calendar,
  Building2,
  Tag,
  Globe,
  Video,
  Loader2,
  Play,
} from "lucide-react";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { createClient } from "@/lib/supabase";
import { ImageGallery } from "@/components/ui/lightbox";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import { detectVideoPlatform, getEmbedUrl, getVideoPlatformLabel, getOriginalVideoUrl } from "@/lib/video-utils";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  video_url: string | null;
  platforms: string[] | null;
  category: string | null;
  tags: string[] | null;
  status: string | null;
  brand?: string | null;
  agency?: string | null;
  country?: string | null;
  format?: string | null;
  date?: string | null;
  year?: number | null;
  images?: string[] | null;
  created_at: string;
}

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [content, setContent] = useState<Campaign | null>(null);
  const [relatedContent, setRelatedContent] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const supabase = createClient();
        
        // Récupérer le contenu principal
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', id)
          .single();
        
        if (campaignError) {
          console.error('Error fetching campaign:', campaignError);
          setError('Contenu non trouvé');
          setIsLoading(false);
          return;
        }
        
        setContent(campaign);
        
        // Récupérer les contenus similaires
        const { data: related } = await supabase
          .from('campaigns')
          .select('*')
          .neq('id', id)
          .eq('status', 'Publié')
          .limit(4);
        
        setRelatedContent(related || []);
      } catch (err) {
        console.error('Error:', err);
        setError('Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <main className="container mx-auto px-4 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la bibliothèque
          </Link>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{error || 'Contenu non trouvé'}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Extraire les infos depuis les champs
  const platform = content.platforms?.[0] || 'N/A';
  const sector = content.category || 'N/A';
  const format = content.format || content.tags?.[0] || 'N/A';
  const country = content.country || "Côte d'Ivoire";
  const brand = content.brand || '';
  const agency = content.agency || '';
  const date = content.date || new Date(content.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <main className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a la bibliotheque
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6 main-container">
            {/* Image principale + galerie avec lightbox */}
            <ImageGallery
              mainImage={content.thumbnail}
              images={content.images || []}
              title={content.title}
            />

            {/* Video player — embed multi-plateforme */}
            {content.video_url && (() => {
              const originalVideoUrl = getOriginalVideoUrl(content.video_url);
              const videoPlatform = detectVideoPlatform(originalVideoUrl);
              const embedUrl = getEmbedUrl(content.video_url);
              const platformLabel = getVideoPlatformLabel(videoPlatform);
              
              // Pour LinkedIn, Facebook ou Instagram: afficher le visuel avec bouton
              if (videoPlatform === "linkedin" || videoPlatform === "facebook" || videoPlatform === "instagram") {
                const iconBg = videoPlatform === "linkedin" 
                  ? "bg-[#0A66C2]" 
                  : videoPlatform === "instagram" 
                    ? "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" 
                    : "bg-[#1877F2]";
                
                return (
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Visuel/Thumbnail cliquable */}
                      <a
                        href={originalVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative group"
                      >
                        {/* Image de la créative */}
                        <div className="relative aspect-[9/16] max-h-[600px] w-full overflow-hidden bg-gray-100">
                          <img
                            src={content.thumbnail || "/placeholder.jpg"}
                            alt={content.title}
                            className="w-full h-full object-contain"
                          />
                          {/* Overlay avec bouton play */}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                            <div className="bg-white/95 rounded-full p-5 shadow-xl group-hover:scale-110 transition-transform">
                              <Play className="h-10 w-10 text-violet-600 ml-1" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Barre d'action en bas */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-20">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${iconBg}`}>
                              <Play className="h-5 w-5 ml-0.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-white text-lg">Voir la vidéo sur {platformLabel}</p>
                              <p className="text-sm text-white/70">Cliquez pour ouvrir dans un nouvel onglet</p>
                            </div>
                            <ExternalLink className="h-5 w-5 text-white/70 ml-auto" />
                          </div>
                        </div>
                      </a>
                    </CardContent>
                  </Card>
                );
              }
              
              // YouTube, Twitter/X, TikTok: embed iframe standard
              return (
                <Card>
                  <CardContent className="p-4">
                    <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Vidéo {platformLabel}
                    </h2>
                    <div className="rounded-lg overflow-hidden">
                      <iframe
                        src={embedUrl}
                        className="w-full aspect-video rounded-lg"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        title={`Vidéo ${platformLabel} de la campagne`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Title and actions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                  {content.title}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {brand}{brand && sector !== 'N/A' ? " - " : ""}{sector !== 'N/A' ? sector : ''}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    if (!isAuthenticated) {
                      window.location.href = `/login?redirect=/content/${id}`;
                      return;
                    }
                    setIsToggling(true);
                    await toggleFavorite(id);
                    setIsToggling(false);
                  }}
                  disabled={isToggling}
                  className={cn(
                    isFavorite(id) ? "text-red-500 border-red-500" : "",
                    isToggling && "opacity-50 cursor-wait"
                  )}
                  title={isFavorite(id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Heart
                    className={cn("h-5 w-5", isFavorite(id) && "fill-current")}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: content.title,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  title="Partager"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Description */}
            {content.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-lg mb-3">Description</h2>
                  <div 
                    className="text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: content.description }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-lg mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {content.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 sidebar-content">
            {/* Metadata card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-lg">Informations</h2>

                <div className="space-y-3">
                  {brand && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Marque:</span>
                      <span className="font-medium">{brand}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Secteur:</span>
                    <span className="font-medium">{sector}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Pays:</span>
                    <span className="font-medium">{country}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium">{format}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Plateforme:</span>
                    <span className="font-medium">{platform}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">{date}</span>
                  </div>

                  {agency && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Agence:</span>
                      <span className="font-medium">{agency}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Related content */}
            {relatedContent.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-lg mb-4">Contenus similaires</h2>
                  <div className="space-y-4">
                    {relatedContent.map((item) => (
                      <Link
                        key={item.id}
                        href={`/content/${item.id}`}
                        className="flex gap-3 group"
                      >
                        <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {item.thumbnail ? (
                            <Image
                              src={item.thumbnail}
                              alt={item.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              {item.title.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.brand || item.category}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
