"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, X, Search, Bell, User, LogOut, Settings, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { createClient } from "@/lib/supabase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPlan, setUserPlan] = useState("Free")
  
  const supabase = createClient()

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserEmail(session.user.email || "")
        const { data: profile } = await supabase
          .from('users')
          .select('name, plan')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          setUserName(profile.name || "")
          setUserPlan(profile.plan || "Free")
        }
      }
    }
    loadUser()
  }, [])

  const isPremium = userPlan.toLowerCase() === "premium"
  const initials = userName ? userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#D0E4F2] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Big Five Creative Library"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1F2B]">Big Five Creative Library</span>
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
          </nav>
        </div>

        <div className="hidden flex-1 items-center justify-center px-8 md:flex">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1F2B]/50" />
            <input
              type="text"
              placeholder="Rechercher par mots-clés, marque, secteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#D0E4F2] bg-white pl-10 pr-4 text-sm text-[#1A1F2B] outline-none transition-colors placeholder:text-[#1A1F2B]/50 focus:border-[#80368D] focus:ring-2 focus:ring-[#80368D]/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative hidden md:flex text-[#1A1F2B]">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#80368D]" />
          </Button>

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
                    {isPremium ? "Premium" : "Gratuit"}
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
                <Link href="/settings" className="flex items-center gap-2 text-[#1A1F2B]">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = "/login"
                }}
                className="flex items-center gap-2 text-red-600 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Deconnexion
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
              href="/subscribe"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-colors hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B]"
              onClick={() => setIsOpen(false)}
            >
              Abonnement
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
