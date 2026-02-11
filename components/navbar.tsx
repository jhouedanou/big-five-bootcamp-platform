"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#D0E4F2] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        <Link href="/" className="group flex items-center gap-3 transition-all duration-300 hover:opacity-80">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-[#80368D]/10 to-[#F2B33D]/10 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
            <Image
              src="/logo.png"
              alt="Big Five Creative Library"
              width={40}
              height={40}
              className="relative h-10 w-10"
              priority
            />
          </div>
          <span className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B]">
            Big Five <span className="text-[#80368D]">Creative Library</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/#features"
            className="relative px-4 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:text-[#1A1F2B] group"
          >
            Fonctionnalités
            <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-[#80368D] transition-all duration-300 group-hover:left-4 group-hover:w-[calc(100%-32px)]" />
          </Link>
          <Link
            href="/pricing"
            className="relative px-4 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:text-[#1A1F2B] group"
          >
            Tarifs
            <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-[#80368D] transition-all duration-300 group-hover:left-4 group-hover:w-[calc(100%-32px)]" />
          </Link>
          <Link
            href="/dashboard"
            className="relative px-4 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:text-[#1A1F2B] group"
          >
            Démo
            <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-[#80368D] transition-all duration-300 group-hover:left-4 group-hover:w-[calc(100%-32px)]" />
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild className="font-medium text-[#1A1F2B] hover:bg-[#D0E4F2]/50">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild className="group font-semibold shadow-lg shadow-[#80368D]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#80368D]/30 hover:scale-105 bg-[#80368D] hover:bg-[#80368D]/90">
            <Link href="/pricing">
              Essai gratuit 30 jours
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="relative md:hidden p-2 rounded-lg transition-colors hover:bg-[#D0E4F2]/50"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6 text-[#1A1F2B]" /> : <Menu className="h-6 w-6 text-[#1A1F2B]" />}
        </button>
      </div>

      {/* Mobile menu with animation */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-[#D0E4F2] bg-white/95 backdrop-blur-xl">
          <nav className="flex flex-col gap-1 px-4 py-4">
            <Link
              href="/#features"
              className="rounded-xl px-4 py-3 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] hover:translate-x-1"
              onClick={() => setIsOpen(false)}
            >
              Fonctionnalités
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl px-4 py-3 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] hover:translate-x-1"
              onClick={() => setIsOpen(false)}
            >
              Tarifs
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl px-4 py-3 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] hover:translate-x-1"
              onClick={() => setIsOpen(false)}
            >
              Démo
            </Link>
            <hr className="my-3 border-[#D0E4F2]" />
            <Link
              href="/login"
              className="rounded-xl px-4 py-3 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] hover:translate-x-1"
              onClick={() => setIsOpen(false)}
            >
              Connexion
            </Link>
            <Button asChild className="mt-3 h-12 font-semibold shadow-lg shadow-[#80368D]/25 bg-[#80368D] hover:bg-[#80368D]/90">
              <Link href="/pricing" onClick={() => setIsOpen(false)}>
                Essai gratuit 30 jours
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
