"use client";

import { useState, useEffect, useRef } from "react";
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
  Pencil,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { createClient } from "@/lib/supabase";
import { ImageGallery } from "@/components/ui/lightbox";
import { getCreativeByIdOrSlug, getRelatedCampaigns } from "@/app/actions/creative";
import { useFavorites } from "@/hooks/use-favorites";
import { cn, getGoogleDriveImageUrl, fixBrokenEncoding } from "@/lib/utils";
import { detectVideoPlatform, getEmbedUrl, getVideoPlatformLabel, getOriginalVideoUrl } from "@/lib/video-utils";
import { isPaidPlan } from "@/lib/pricing";
import { UpgradePopup } from "@/components/upgrade-popup";
import { useRouter } from "next/navigation";

const MONTHLY_CLICK_LIMIT = 5;

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
  analyse?: string | null;
  slug?: string | null;
  axe?: string[] | null;
  created_at: string;
}

/**
 * Formate le texte de description en HTML.
 * - Si c'est déjà du HTML (contient des balises), le retourne tel quel
 * - Sinon, convertit les retours à la ligne en <br>, **bold** en <strong>, etc.
 */
function formatDescription(text: string): string {
  // Si c'est déjà du HTML (contient des balises), retourner tel quel
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  let html = text
    // Échapper les caractères HTML dangereux
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // **bold** → <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // *italic* → <em>
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Les lignes vides → paragraphes
    .replace(/\n\s*\n/g, '</p><p>')
    // Les retours à la ligne simples → <br>
    .replace(/\n/g, '<br/>')

  return `<p>${html}</p>`;
}

export default function ContentDetailClient({ id }: { id: string }) {
  const [content, setContent] = useState<Campaign | null>(null);
  const [relatedContent, setRelatedContent] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites();
  const { isAdmin } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);
  const [userPlan, setUserPlan] = useState("Free");
  const [monthlyClicks, setMonthlyClicks] = useState(0);
  const [monthlyExplored, setMonthlyExplored] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [clickTracked, setClickTracked] = useState(false);
  const isFreeUser = !isPaidPlan(userPlan);
  const router = useRouter();

  // Charger le plan utilisateur, vérifier la limite, et tracker le clic
  // Utilise l'API serveur (cookies fiables) plutôt que getSession() client (cache stale)
  useEffect(() => {
    const loadUserDataAndTrack = async () => {
      try {
        // L'API track-click utilise getSupabaseServer() côté serveur
        // qui lit les cookies de session (fiable même après refresh)
        const getRes = await fetch('/api/track-click');

        if (getRes.status === 401) {
          // Utilisateur non authentifié - le proxy devrait rediriger,
          // mais au cas où, on ne fait rien (pas de gating possible)
          return;
        }

        if (getRes.ok) {
          const getData = await getRes.json();
          setMonthlyClicks(getData.clicks || 0);
          setMonthlyExplored(getData.explored || 0);

          // Mettre à jour le plan depuis les données serveur
          if (!getData.isFree) {
            setUserPlan('Pro'); // L'API a confirmé que c'est un utilisateur payant
          }

          // Si free user et limite atteinte → bloquer l'accès
          if (getData.isFree && (getData.clicks || 0) >= MONTHLY_CLICK_LIMIT) {
            setIsBlocked(true);
            setShowUpgrade(true);
            return;
          }

          // Si free user et pas encore à la limite → tracker ce clic
          if (getData.isFree) {
            const postRes = await fetch('/api/track-click', { method: 'POST' });
            if (postRes.ok) {
              const postData = await postRes.json();
              if (!postData.allowed) {
                setIsBlocked(true);
                setShowUpgrade(true);
                return;
              }
              setMonthlyClicks(postData.clicks || getData.clicks || 0);
            }
          }
        }
      } catch { /* ignore */ }
    };
    loadUserDataAndTrack();
  }, []);

  // Barre de progression de lecture
  useEffect(() => {
    const handleScroll = () => {
      const articleEl = articleRef.current;
      if (!articleEl) return;

      const rect = articleEl.getBoundingClientRect();
      const articleTop = rect.top + window.scrollY;
      const articleHeight = rect.height;
      const scrolled = window.scrollY - articleTop;
      const viewportHeight = window.innerHeight;
      const progress = Math.min(100, Math.max(0, (scrolled / (articleHeight - viewportHeight)) * 100));
      setReadProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [content]);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Vérifier le cache sessionStorage
        const cacheKey = `campaign_${id}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
          try {
            const { campaign: cached, related: cachedRelated, timestamp } = JSON.parse(cachedData);
            // Cache valide pendant 5 minutes
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              setContent(cached);
              setRelatedContent(cachedRelated || []);
              setIsLoading(false);
              return;
            }
          } catch { /* cache invalide, on continue */ }
        }

        // Utiliser la server action (service role, pas de RLS)
        const result = await getCreativeByIdOrSlug(id);

        if (!result.success || !result.data) {
          setError('Contenu non trouvé');
          setIsLoading(false);
          return;
        }

        const campaign = result.data;

        setContent({
          ...campaign,
          title: fixBrokenEncoding(campaign.title),
          description: fixBrokenEncoding(campaign.description),
          brand: fixBrokenEncoding(campaign.brand),
          agency: fixBrokenEncoding(campaign.agency),
          country: fixBrokenEncoding(campaign.country),
          category: fixBrokenEncoding(campaign.category),
        } as Campaign);

        // Récupérer les contenus similaires via server action
        const relatedResult = await getRelatedCampaigns(
          campaign.id,
          campaign.tags,
          campaign.category,
          campaign.brand
        );

        const related = (relatedResult.data || []).map((r: any) => ({
          ...r,
          title: fixBrokenEncoding(r.title),
          description: fixBrokenEncoding(r.description),
          brand: fixBrokenEncoding(r.brand),
          agency: fixBrokenEncoding(r.agency),
          country: fixBrokenEncoding(r.country),
          category: fixBrokenEncoding(r.category),
        }));

        setRelatedContent(related);

        // Sauvegarder en cache sessionStorage
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            campaign,
            related,
            timestamp: Date.now(),
          }));
        } catch { /* quota exceeded, ignore */ }
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
        <DashboardNavbar
          userPlan={userPlan}
          monthlyClicks={monthlyClicks}
          monthlyClickLimit={5}
          isFreeUser={isFreeUser}
          monthlyExplored={monthlyExplored}
        />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Si l'utilisateur free a atteint sa limite, bloquer l'accès à la page
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar
          userPlan={userPlan}
          monthlyClicks={monthlyClicks}
          monthlyClickLimit={MONTHLY_CLICK_LIMIT}
          isFreeUser={isFreeUser}
          monthlyExplored={monthlyExplored}
        />
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
              <p className="text-muted-foreground">
                Vous avez atteint votre limite de {MONTHLY_CLICK_LIMIT} campagnes consultées ce mois-ci.
              </p>
              <Button
                className="mt-4 bg-gradient-to-r from-[#80368D] to-[#a855f7] hover:from-[#6b2d76] hover:to-[#9333ea] text-white"
                onClick={() => router.push('/subscribe')}
              >
                Passer à un plan payant
              </Button>
            </CardContent>
          </Card>
        </main>
        <UpgradePopup
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          reason="clicks"
        />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar
          userPlan={userPlan}
          monthlyClicks={monthlyClicks}
          monthlyClickLimit={5}
          isFreeUser={isFreeUser}
          monthlyExplored={monthlyExplored}
        />
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

  const hasGallery = !!(content.thumbnail || (content.images && content.images.length > 0));

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      {/* Barre de progression de lecture */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/30">
        <div
          className="h-full bg-gradient-to-r from-[#80368D] to-[#a855f7] transition-all duration-150 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <main ref={articleRef} className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la bibliothèque
        </Link>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
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
                            src={getGoogleDriveImageUrl(content.thumbnail) || "/placeholder.jpg"}
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
                {isAdmin && content.id && (
                  <Link href={`/admin/campaigns?edit=${content.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-violet-600 border-violet-300 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-700 dark:hover:bg-violet-950"
                      title="Modifier cette campagne (Admin)"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    if (!isAuthenticated) {
                      window.location.href = `/login?redirect=/content/${id}`;
                      return;
                    }
                    setIsToggling(true);
                    await toggleFavorite(content.id);
                    setIsToggling(false);
                  }}
                  disabled={isToggling}
                  className={cn(
                    isFavorite(content.id) ? "text-red-500 border-red-500" : "",
                    isToggling && "opacity-50 cursor-wait"
                  )}
                  title={isFavorite(content.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Heart
                    className={cn("h-5 w-5", isFavorite(content.id) && "fill-current")}
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
                    dangerouslySetInnerHTML={{ __html: formatDescription(content.description) }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Analyse */}
            {content.analyse && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-lg mb-3">Analyse</h2>
                  <div
                    className="text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatDescription(content.analyse) }}
                  />
                </CardContent>
              </Card>
            )}
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

                  {content.axe && content.axe.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-3 text-sm mb-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Axe(s):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-7">
                        {content.axe.map((a) => (
                          <Badge key={a} variant="outline" className="text-xs">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-lg mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(content.tags)].map((tag) => (
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

          {/* Sidebar - sticky avec galerie */}
          <div className="lg:sticky lg:top-6 space-y-6">
            {/* Galerie d'images */}
            {hasGallery && (
              <ImageGallery
                mainImage={content.thumbnail}
                images={content.images || []}
                title={content.title}
              />
            )}



            {/* Related content */}
            {relatedContent.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-lg mb-4">Contenus similaires</h2>
                  <div className="space-y-4">
                    {relatedContent.map((item) => (
                      <Link
                        key={item.id}
                        href={`/content/${item.slug || item.id}`}
                        className="flex gap-3 group"
                        onClick={async (e) => {
                          if (!isFreeUser) return; // Paid users: navigation libre
                          e.preventDefault();
                          try {
                            const res = await fetch('/api/track-click', { method: 'POST' });
                            const data = await res.json();
                            if (!res.ok || !data.allowed) {
                              setIsBlocked(true);
                              setShowUpgrade(true);
                              return;
                            }
                            setMonthlyClicks(data.clicks || 0);
                            router.push(`/content/${item.slug || item.id}`);
                          } catch {
                            router.push(`/content/${item.slug || item.id}`);
                          }
                        }}
                      >
                        <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {item.thumbnail ? (
                            <Image
                              src={getGoogleDriveImageUrl(item.thumbnail)}
                              alt={item.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
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
