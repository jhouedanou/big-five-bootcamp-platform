"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, Search, User, LogOut, Settings, CreditCard, Crown, Sparkles, Clock, Users, Heart, MousePointer, Building2, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useAuthContext } from "@/components/auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardNavbar({
  searchQuery: externalSearchQuery,
  onSearchChange,
  userPlan: externalUserPlan,
  monthlyClicks: externalMonthlyClicks,
  monthlyClickLimit,
  isFreeUser: externalIsFreeUser,
  monthlyExplored: externalMonthlyExplored,
}: {
  searchQuery?: string;
  onSearchChange?: (query: string) => void
  userPlan?: string
  monthlyClicks?: number
  monthlyClickLimit?: number
  isFreeUser?: boolean
  monthlyExplored?: number
} = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [internalSearchQuery, setInternalSearchQuery] = useState("")

  // Lire tout depuis le contexte centralisé — AUCUN appel getUser() ni requête DB
  const {
    user,
    userProfile,
    userPlan: contextUserPlan,
    isFreeUser: contextIsFreeUser,
    isPremium: contextIsPremium,
    monthlyClicks: contextMonthlyClicks,
    monthlyExplored: contextMonthlyExplored,
    signOut,
  } = useAuthContext()

  const userName = userProfile?.name || ""
  const userEmail = user?.email || ""
  const subscriptionEndDate = userProfile?.subscription_end_date || null
  const subscriptionStatus = userProfile?.subscription_status || null
  
  // Utiliser la recherche externe si fournie, sinon interne
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery
  const setSearchQuery = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value)
    } else {
      setInternalSearchQuery(value)
    }
  }

  // Use external props if provided, otherwise use context data
  const effectivePlan = externalUserPlan || contextUserPlan
  const isPremium = externalUserPlan
    ? ["basic", "pro"].includes(externalUserPlan.toLowerCase())
    : contextIsPremium
  const effectiveIsFreeUser = externalIsFreeUser !== undefined ? externalIsFreeUser : contextIsFreeUser
  const effectiveMonthlyClicks = externalMonthlyClicks !== undefined ? externalMonthlyClicks : contextMonthlyClicks
  const effectiveMonthlyExplored = externalMonthlyExplored !== undefined ? externalMonthlyExplored : contextMonthlyExplored
  const initials = userName ? userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?"

  // Calcul de la durée restante de l'abonnement
  const getSubscriptionInfo = () => {
    if (!isPremium || !subscriptionEndDate) {
      return { active: false, daysLeft: 0, label: "", expiringSoon: false, expired: false }
    }
    
    const endDate = new Date(subscriptionEndDate)
    const now = new Date()
    const diffMs = endDate.getTime() - now.getTime()
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (daysLeft <= 0) {
      return { active: false, daysLeft: 0, label: "Expiré", expiringSoon: false, expired: true }
    }
    if (daysLeft <= 7) {
      return { active: true, daysLeft, label: `${daysLeft}j`, expiringSoon: true, expired: false }
    }
    return { active: true, daysLeft, label: `${daysLeft}j`, expiringSoon: false, expired: false }
  }

  const subInfo = getSubscriptionInfo()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#D0E4F2] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Laveiye"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1F2B]">Laveiye</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B] transition-colors hover:bg-[#D0E4F2]/50"
            >
              Bibliothèque
            </Link>
            <Link
              href="/profile"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B]"
            >
              Profil
            </Link>
            <Link
              href="/favorites"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] flex items-center gap-1"
            >
              <Heart className="h-3.5 w-3.5" />
              Favoris
            </Link>
            {isPremium && (
              <Link
                href="/favorites?tab=collections"
                className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] flex items-center gap-1"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Collections
              </Link>
            )}
            {isPremium && (
              <Link
                href="/dashboard/brand-requests"
                className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] flex items-center gap-1"
              >
                <Building2 className="h-3.5 w-3.5" />
                Marques
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden flex-1 items-center justify-center px-8 md:flex">
          <div className="relative w-full max-w-xl group">
            {/* Glow gradient de fond */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#80368D]/40 via-[#F2B33D]/30 to-[#29358B]/40 rounded-2xl blur-lg opacity-60 group-focus-within:opacity-100 group-hover:opacity-80 transition-opacity duration-300" />
            <div className="relative flex items-center">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-full bg-[#80368D] group-focus-within:bg-[#80368D] transition-colors">
                <Search className="h-4 w-4 text-white" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par mots-clés, marque, secteur, pays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-13 w-full rounded-2xl border-2 border-[#80368D]/40 bg-gradient-to-r from-[#D0E4F2]/40 to-white pl-14 pr-4 text-sm font-semibold text-[#1A1F2B] shadow-lg shadow-[#80368D]/15 outline-none transition-all placeholder:text-[#1A1F2B]/45 placeholder:font-medium focus:border-[#80368D] focus:ring-4 focus:ring-[#80368D]/20 focus:shadow-xl focus:shadow-[#80368D]/20 focus:bg-white hover:border-[#80368D]/60 hover:shadow-xl hover:shadow-[#80368D]/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#1A1F2B]/50 hover:text-white hover:bg-[#80368D] transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Compteur de clics mensuel (Free) */}
          {effectiveIsFreeUser && (
            <div className="hidden md:flex items-center gap-1.5 rounded-full px-3 h-8 bg-[#D0E4F2] text-[#1A1F2B] text-xs font-semibold">
              <MousePointer className="h-3.5 w-3.5" />
              {effectiveMonthlyClicks}/{monthlyClickLimit || 5} ce mois
            </div>
          )}
          {/* Compteur d'usage mensuel (Pro/Agency payant) */}
          {!effectiveIsFreeUser && isPremium && effectiveMonthlyExplored > 0 && (
            <div className="hidden md:flex items-center gap-1.5 rounded-full px-3 h-8 bg-[#10B981]/10 text-[#10B981] text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              {effectiveMonthlyExplored} explorée{effectiveMonthlyExplored > 1 ? 's' : ''} ce mois
            </div>
          )}
          {!effectiveIsFreeUser && isPremium && effectiveMonthlyExplored === 0 && (
            <div className="hidden md:flex items-center gap-1.5 rounded-full px-3 h-8 bg-[#10B981]/10 text-[#10B981] text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              0 explorée ce mois
            </div>
          )}
          {/* Bouton d'abonnement : durée restante ou incitatif */}
          {isPremium && subInfo.active && !subInfo.expiringSoon ? (
            /* Plan payant actif, pas d'expiration proche → bouton doré */
            <div className="hidden md:flex">
              <div className="flex items-center gap-1.5 rounded-full px-3 h-8 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 text-xs font-bold shadow-sm">
                <Crown className="h-3.5 w-3.5" />
                {effectivePlan} · {subInfo.label}
              </div>
            </div>
          ) : isPremium && subInfo.active && subInfo.expiringSoon ? (
            /* Premium actif mais expire dans ≤ 7 jours → bouton "Renouveler" */
            <Link href="/subscribe" className="hidden md:flex">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs font-semibold rounded-full px-3 h-8 bg-amber-100 text-amber-800 hover:bg-amber-200 animate-pulse"
              >
                <Clock className="h-3.5 w-3.5" />
                Renouveler · {subInfo.label}
              </Button>
            </Link>
          ) : isPremium && subInfo.expired ? (
            /* Abonnement expiré → bouton rouge "Renouveler" */
            <Link href="/subscribe" className="hidden md:flex">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs font-semibold rounded-full px-3 h-8 bg-red-100 text-red-800 hover:bg-red-200"
              >
                <Clock className="h-3.5 w-3.5" />
                Renouveler
              </Button>
            </Link>
          ) : (
            /* Pas de plan payant → bouton "Voir les plans" */
            <Link href="/pricing" className="hidden md:flex">
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold rounded-full px-3 h-8 bg-gradient-to-r from-[#80368D] to-[#29358B] text-white hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Voir les plans
              </Button>
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#80368D] text-sm font-medium text-white">
                  {initials}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-[#D0E4F2]">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-[#1A1F2B]">{userName || "Utilisateur"}</p>
                <p className="text-xs text-[#1A1F2B]/60">{userEmail}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    isPremium
                      ? "bg-[#80368D]/10 text-[#80368D]"
                      : "bg-[#10B981]/10 text-[#10B981]"
                  }`}>
                    {effectivePlan || "Gratuit"}
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2 text-[#1A1F2B]">
                  <User className="h-4 w-4" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/subscribe" className="flex items-center gap-2 text-[#1A1F2B]">
                  <CreditCard className="h-4 w-4" />
                  Abonnement
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/favorites" className="flex items-center gap-2 text-[#1A1F2B]">
                  <Heart className="h-4 w-4" />
                  Mes Favoris
                </Link>
              </DropdownMenuItem>
              {isPremium && (
                <DropdownMenuItem asChild>
                  <Link href="/favorites?tab=collections" className="flex items-center gap-2 text-[#1A1F2B]">
                    <FolderOpen className="h-4 w-4" />
                    Collections
                  </Link>
                </DropdownMenuItem>
              )}
              {isPremium && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/brand-requests" className="flex items-center gap-2 text-[#1A1F2B]">
                    <Building2 className="h-4 w-4" />
                    Suivi de marques
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 text-[#1A1F2B]">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut()
                  window.location.href = "/login"
                }}
                className="flex items-center gap-2 text-red-600 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            className="md:hidden text-[#1A1F2B]"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-[#D0E4F2] bg-white md:hidden">
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1F2B]/50" />
              <input
                type="text"
                placeholder="Rechercher des campagnes..."
                className="h-10 w-full rounded-lg border border-[#D0E4F2] bg-white pl-10 pr-4 text-sm text-[#1A1F2B] outline-none"
              />
            </div>
          </div>
          <nav className="flex flex-col gap-1 px-4 pb-4">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B] transition-colors hover:bg-[#D0E4F2]/50"
              onClick={() => setIsOpen(false)}
            >
              Bibliothèque
            </Link>
            <Link
              href="/profile"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B]"
              onClick={() => setIsOpen(false)}
            >
              Profil
            </Link>
            <Link
              href="/favorites"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] flex items-center gap-1.5"
              onClick={() => setIsOpen(false)}
            >
              <Heart className="h-4 w-4 text-red-500" />
              Mes Favoris
            </Link>
            {isPremium && (
              <Link
                href="/favorites?tab=collections"
                className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] flex items-center gap-1.5"
                onClick={() => setIsOpen(false)}
              >
                <FolderOpen className="h-4 w-4 text-[#80368D]" />
                Collections
              </Link>
            )}
            {/* Bouton abonnement mobile */}
            <Link
              href={isPremium ? "/subscribe" : "/pricing"}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isPremium && subInfo.active && !subInfo.expiringSoon
                  ? "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800"
                  : isPremium && subInfo.active && subInfo.expiringSoon
                    ? "bg-amber-50 text-amber-800"
                    : isPremium && subInfo.expired
                      ? "bg-red-50 text-red-800"
                      : "bg-gradient-to-r from-[#80368D]/10 to-[#29358B]/10 text-[#80368D] font-semibold"
              }`}
              onClick={() => setIsOpen(false)}
            >
              {isPremium && subInfo.active && !subInfo.expiringSoon ? (
                <span className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  {effectivePlan} · {subInfo.label}
                </span>
              ) : isPremium && subInfo.active && subInfo.expiringSoon ? (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Renouveler · {subInfo.label}
                </span>
              ) : isPremium && subInfo.expired ? (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Abonnement expiré — Renouveler
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Voir les plans
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B]"
              onClick={() => setIsOpen(false)}
            >
              Paramètres
            </Link>
            <div className="border-t border-[#D0E4F2] mt-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setIsOpen(false)
                  await signOut()
                  window.location.href = "/login"
                }}
                className="w-full rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
