"use client"

import React from "react"

import Link from "next/link"
import Image from "next/image"
import { Play, Calendar, Globe, Facebook, Instagram, Linkedin, Youtube, Crown, Heart, Pencil, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useAuthContext } from "@/components/auth-provider"
import { useFavorites } from "@/hooks/use-favorites"
import { toastCampaignShortcut } from "@/lib/campaign-shortcut-toast"
import { cn, getGoogleDriveImageUrl } from "@/lib/utils"
import { detectVideoPlatform, isDirectVideoFile, getVideoThumbnail } from "@/lib/video-utils"
import { canAccessPremiumContent } from "@/lib/pricing"
import { CountryFlag } from "@/components/ui/country-flag"
import { XLogo } from "@/components/icons/x-logo"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

/**
 * Prévisualisation vidéo au survol (brief vidéos, priorité 4).
 *
 * Montée uniquement au survol — rien n'est téléchargé tant que le curseur
 * n'est pas sur la carte — après un court délai pour ne pas déclencher au
 * simple passage. Silencieuse, en boucle ; au départ du curseur le composant
 * est démonté et la vignette avec son bouton Play réapparaissent.
 *
 * Réservée aux fichiers vidéo directs (mp4/webm, bucket `videos`) : les pages
 * d'intégration Drive ou sociales ne permettent pas d'aperçu muet fiable. Sur
 * écran tactile (pas de survol), le comportement du brief est « lecture au
 * clic » : le tap ouvre la fiche, où le lecteur se lance — rien à monter ici.
 */
function HoverVideoPreview({ src, active }: { src: string; active: boolean }) {
  const [ready, setReady] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    if (!active) setReady(false)
  }, [active])

  if (!active || failed) return null

  return (
    <video
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-hidden="true"
      onCanPlay={() => setReady(true)}
      onError={() => setFailed(true)}
      className={cn(
        // z-[4] : au-dessus de l'image, sous le verrou premium (z-[5]).
        "absolute inset-0 z-[4] h-full w-full object-cover transition-opacity duration-200",
        ready ? "opacity-100" : "opacity-0"
      )}
    />
  )
}

/** Survol différé : vrai 250 ms après l'entrée, faux dès la sortie. */
function useDelayedHover(delayMs = 250) {
  const [hovering, setHovering] = React.useState(false)
  const timerRef = React.useRef<number | null>(null)

  const onMouseEnter = React.useCallback(() => {
    timerRef.current = window.setTimeout(() => setHovering(true), delayMs)
  }, [delayMs])

  const onMouseLeave = React.useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setHovering(false)
  }, [])

  React.useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    []
  )

  return { hovering, onMouseEnter, onMouseLeave }
}

export interface ContentItem {
  id: string
  title: string
  description: string
  summary?: string // Résumé court de la campagne
  imageUrl: string
  platform: string
  platforms?: string[]
  country: string
  sector: string
  format: string
  tags: string[]
  date: string
  isVideo?: boolean
  images?: string[]
  videoUrl?: string
  brand?: string
  agency?: string
  year?: number
  award?: string
  axe?: string[]
  status?: 'Publié' | 'Brouillon' | 'En attente'
  accessLevel?: 'free' | 'premium' // 'free' = visible par tous, 'premium' = accessible avec Basic ou Pro
  analyse?: string // Analyse stratégique de la campagne
  howToUse?: string // Comment s'en servir / s'inspirer de cette campagne
  slug?: string // Permalien SEO-friendly
  createdAt?: string // Date ISO de création (depuis Supabase)
  featured?: boolean // Mise en avant par l'admin (campagne de la semaine)
  publicationUrl?: string // Lien vers la publication d'origine
  tempsFortSlugs?: string[] // Slugs des « Temps forts » associés (Coupe du monde, Ramadan, etc.)
}

interface ContentCardProps {
  content: ContentItem
  viewMode?: "grid" | "list"
  onBeforeNavigate?: (content: ContentItem) => boolean | Promise<boolean>
  isBlocked?: boolean
}

const platformConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
  "Facebook": { bg: "bg-[#1877F2]", icon: <Facebook className="h-3.5 w-3.5 text-white" /> },
  "Instagram": { bg: "bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737]", icon: <Instagram className="h-3.5 w-3.5 text-white" /> },
  "LinkedIn": { bg: "bg-[#0A66C2]", icon: <Linkedin className="h-3.5 w-3.5 text-white" /> },
  "TikTok": { bg: "bg-black", icon: <span className="text-xs font-bold text-white">TT</span> },
  "Twitter/X": { bg: "bg-black", icon: <XLogo className="h-3.5 w-3.5 text-white" /> },
  "X": { bg: "bg-black", icon: <XLogo className="h-3.5 w-3.5 text-white" /> },
  "Twitter": { bg: "bg-black", icon: <XLogo className="h-3.5 w-3.5 text-white" /> },
  "X (Twitter)": { bg: "bg-black", icon: <XLogo className="h-3.5 w-3.5 text-white" /> },
  "YouTube": { bg: "bg-[#FF0000]", icon: <Youtube className="h-3.5 w-3.5 text-white" /> },
  "Outdoor": { bg: "bg-[#0A1F44]", icon: <span className="text-xs font-bold text-white">OOH</span> },
}

// Formate la date en français (ex: "15 janvier 2024")
function formatDateFr(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, "d MMMM yyyy", { locale: fr })
  } catch {
    return dateString
  }
}

export function ContentCard({ content, viewMode = "grid", onBeforeNavigate, isBlocked }: ContentCardProps) {
  const platform = platformConfig[content.platform] || { bg: "bg-gray-500", icon: <span className="text-xs font-bold text-white">?</span> }
  const sectorColor = "text-[#FFFFFF] bg-[#F2B33D] font-medium text-shadow-lg"
  const isPremium = content.accessLevel === 'premium'
  const { isAdmin } = useAuth()
  const { userPlan } = useAuthContext()
  // Verrou Premium : seuls les abonnés Basic ou Pro (ou admins) peuvent ouvrir une campagne premium.
  // Free et Basic voient l'image floutée et la navigation est bloquée côté carte.
  const isPremiumLocked = isPremium && !isAdmin && !canAccessPremiumContent(userPlan)

  // Prévisualisation au survol : fichiers vidéo directs seulement, jamais sur
  // un contenu verrouillé (l'aperçu contournerait le flou premium).
  const canHoverPreview =
    !!content.isVideo && !!content.videoUrl && !isPremiumLocked && isDirectVideoFile(content.videoUrl)
  const { hovering, onMouseEnter, onMouseLeave } = useDelayedHover()
  // Visuel dont l'URL répond mais ne renvoie pas une image → repli initiales.
  const [imageFailed, setImageFailed] = React.useState(false)

  // Sans image principale, YouTube et Drive exposent une vignette déductible de
  // l'URL. Avant, la carte tombait directement sur les initiales : une campagne
  // vidéo sans thumbnail s'affichait sans aucun visuel (recette du 19/08).
  // `imageFailed` couvre le cas d'un visuel dont l'URL répond mais ne renvoie
  // pas une image : sans lui, la carte affiche l'icône d'image brisée du
  // navigateur au lieu du repli maison.
  const displayImageUrl =
    content.imageUrl || (content.videoUrl ? getVideoThumbnail(content.videoUrl) : null)
  const { isFavorite, toggleFavorite, isAuthenticated, loading: favLoading } = useFavorites()
  const [isToggling, setIsToggling] = React.useState(false)
  const isCurrentFavorite = isFavorite(content.id)

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=/dashboard'
      return
    }
    const wasFavorite = isFavorite(content.id)
    setIsToggling(true)
    const ok = await toggleFavorite(content.id)
    setIsToggling(false)
    if (ok && !wasFavorite) toastCampaignShortcut("Ajouté aux favoris")
  }

  const handleClick = async (e: React.MouseEvent) => {
    if (isPremiumLocked) {
      e.preventDefault()
    }
    if (onBeforeNavigate) {
      const allowed = await onBeforeNavigate(content)
      if (!allowed) {
        e.preventDefault()
        return
      }
    }
    if (isBlocked) {
      e.preventDefault()
    }
  }

  // Mode liste : carte horizontale compacte
  if (viewMode === "list") {
    return (
      <Link href={`/content/${content.slug || content.id}`} className="group block" onClick={handleClick}>
        <article className={`modern-card overflow-hidden hover-lift transition-all duration-300 hover:shadow-xl flex flex-row ${
          isPremium
            ? "ring-2 ring-amber-400/80 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 hover:ring-amber-300"
            : "hover:shadow-[#F2B33D]/10"
        }`}>
          {/* Image compacte à gauche */}
          <div
            className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#0A1F44] to-[#1a3a6e]"
            onMouseEnter={canHoverPreview ? onMouseEnter : undefined}
            onMouseLeave={canHoverPreview ? onMouseLeave : undefined}
          >
            {canHoverPreview && (
              <HoverVideoPreview src={content.videoUrl!} active={hovering} />
            )}
            {displayImageUrl && !imageFailed ? (
              <Image
                src={getGoogleDriveImageUrl(displayImageUrl) || "/placeholder.svg"}
                alt={content.title}
                fill
                sizes="160px"
                onError={() => setImageFailed(true)}
                className={cn(
                  "object-cover transition-transform duration-300 group-hover:scale-105",
                  isPremiumLocked && "blur-md scale-110 group-hover:scale-110"
                )}
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-2xl font-bold text-white/20">
                  {content.title.substring(0, 2).toUpperCase()}
                </div>
              </div>
            )}
            {/* Overlay verrou Premium */}
            {isPremiumLocked && (
              <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-lg">
                  <Lock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            )}
            {/* Platform badge */}
            <div className="absolute right-2 top-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${platform.bg} shadow-lg ring-2 ring-white/20`}>
                {platform.icon}
              </div>
            </div>
            {/* Premium badge */}
            {isPremium && (
              <div className="absolute left-2 top-2">
                <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2 py-0.5 shadow-lg shadow-amber-500/30">
                  <Crown className="h-2.5 w-2.5 text-white" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white">Premium</span>
                </div>
              </div>
            )}
            {/* Video overlay */}
            {content.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition-all group-hover:opacity-100">
                  <Play className="h-4 w-4 text-[#0A1F44]" fill="currentColor" />
                </div>
              </div>
            )}
            {/* Favorite button */}
            <button
              onClick={handleToggleFavorite}
              disabled={isToggling || favLoading}
              className={cn(
                "absolute left-2 bottom-2 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                "bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isToggling && "opacity-50 cursor-wait"
              )}
              title={isCurrentFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  isCurrentFavorite
                    ? "fill-red-500 text-red-500"
                    : "text-gray-600 hover:text-red-500"
                )}
              />
            </button>
          </div>
          {/* Contenu à droite */}
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="line-clamp-2 font-[family-name:var(--font-heading)] text-base font-bold text-[#0F0F0F] transition-colors group-hover:text-[#F2B33D]">
                {content.title}
              </h3>
              {content.summary && (
                <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-relaxed text-[#0F0F0F]/70">
                  {content.summary}
                </p>
              )}
            </div>
            <div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-xs ${sectorColor}`}>
                  {content.sector}
                </span>
                {content.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F5F5F5]/60 px-2 py-0.5 text-xs font-medium text-[#0F0F0F]/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-medium text-[#0F0F0F]/70">
                <div className="flex items-center gap-1.5">
                  <CountryFlag country={content.country} className="h-3.5 w-4" />
                  <span>{content.country}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDateFr(content.date)}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link href={`/content/${content.slug || content.id}`} className="group flex flex-1 flex-col" onClick={handleClick}>
      <article className={`modern-card flex flex-1 flex-col overflow-hidden hover-lift transition-all duration-300 hover:shadow-xl ${
        isPremium
          ? "ring-2 ring-amber-400/80 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 hover:ring-amber-300"
          : "hover:shadow-[#F2B33D]/10"
      }`}>
        <div
          className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#0A1F44] to-[#1a3a6e]"
          onMouseEnter={canHoverPreview ? onMouseEnter : undefined}
          onMouseLeave={canHoverPreview ? onMouseLeave : undefined}
        >
          {canHoverPreview && (
            <HoverVideoPreview src={content.videoUrl!} active={hovering} />
          )}
          {displayImageUrl && !imageFailed ? (
            <Image
              src={getGoogleDriveImageUrl(displayImageUrl) || "/placeholder.svg"}
              alt={content.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImageFailed(true)}
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-105",
                isPremiumLocked && "blur-lg scale-110 group-hover:scale-110"
              )}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-4xl font-bold text-white/20">
                {content.title.substring(0, 2).toUpperCase()}
              </div>
            </div>
          )}

          {/* Overlay verrou Premium */}
          {isPremiumLocked && (
            <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-black/45">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-xl">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <span className="block display-flex items-center justify-center p-[1em] text-center text-[11px] font-bold uppercase tracking-wider text-white drop-shadow-md">
                  Basic ou Pro requis
              </span>
            </div>
          )}

          {/* Video play overlay */}
          {content.isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition-all group-hover:opacity-100">
                <Play className="h-6 w-6 text-[#0A1F44]" fill="currentColor" />
              </div>
            </div>
          )}

          {/* Video platform badge (bottom-right) */}
          {content.isVideo && content.videoUrl && (
            <div className="absolute right-2.5 bottom-2.5">
              {(() => {
                const vp = detectVideoPlatform(content.videoUrl || "");
                // instagram, tiktok et drive sont des plateformes reconnues par
                // lib/video-utils.ts mais manquaient ici : `vpStyles[vp]` valait
                // undefined, ce qui produisait une pastille transparente sans
                // libellé. Le repli sur `unknown` couvre désormais tout ajout futur.
                const vpStyles: Record<string, string> = {
                  youtube: "bg-red-600",
                  facebook: "bg-[#1877F2]",
                  instagram: "bg-[#C13584]",
                  tiktok: "bg-black",
                  twitter: "bg-black",
                  linkedin: "bg-[#0A66C2]",
                  drive: "bg-[#0F9D58]",
                  file: "bg-[#F2B33D]",
                  livid: "bg-indigo-600",
                  unknown: "bg-gray-600",
                };
                const vpLabels: Record<string, string> = {
                  youtube: "▶ YT",
                  facebook: "▶ FB",
                  instagram: "▶ IG",
                  tiktok: "▶ TT",
                  twitter: "▶ X",
                  linkedin: "▶ LI",
                  drive: "▶ Drive",
                  file: "▶ Vidéo",
                  livid: "▶ livid",
                  unknown: "▶",
                };
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg ${vpStyles[vp] || vpStyles.unknown}`}>
                    {vpLabels[vp] || vpLabels.unknown}
                  </span>
                );
              })()}
            </div>
          )}

          {/* Platform badge */}
          <div className="absolute right-2.5 top-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${platform.bg} shadow-lg ring-2 ring-white/20`}>
              {platform.icon}
            </div>
          </div>

          {/* Premium badge */}
          {isPremium && (
            <div className="absolute left-2.5 top-2.5">
              <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2.5 py-1 shadow-lg shadow-amber-500/30">
                <Crown className="h-3 w-3 text-white" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Premium</span>
              </div>
            </div>
          )}

          {/* Admin edit button */}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.location.href = `/admin/campaigns?edit=${content.id}`
              }}
              className="absolute right-2.5 bottom-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#F2B33D]/90 hover:bg-[#F2B33D] shadow-lg backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/50"
              title="Modifier (Admin)"
            >
              <Pencil className="h-3.5 w-3.5 text-white" />
            </button>
          )}

          {/* Favorite button */}
          <button
            onClick={handleToggleFavorite}
            disabled={isToggling || favLoading}
            className={cn(
              "absolute left-2.5 bottom-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
              "bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              isToggling && "opacity-50 cursor-wait"
            )}
            title={isCurrentFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                isCurrentFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-gray-600 hover:text-red-500"
              )}
            />
          </button>

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
            <span className="mb-4 rounded-full bg-[#F2B33D] px-5 py-2 text-sm font-semibold text-white shadow-lg">
              Voir détails
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <h3 className="line-clamp-2 font-[family-name:var(--font-heading)] text-base font-bold text-[#0F0F0F] transition-colors group-hover:text-[#F2B33D]">
              {content.title}
            </h3>

            {/* Résumé de la campagne */}
            {content.summary && (
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-[#0F0F0F]/70">
                {content.summary}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs ${sectorColor}`}>
                {content.sector}
              </span>
              {content.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#F5F5F5]/60 px-2.5 py-1 text-xs font-medium text-[#0F0F0F]/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm font-medium text-[#0F0F0F]/70">
            <div className="flex items-center gap-1.5">
              <CountryFlag country={content.country} className="h-4 w-5" />
              <span>{content.country}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatDateFr(content.date)}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
