"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-xl border-b border-[#D0E4F2] shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3 transition-all duration-300 hover:opacity-80">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-[#80368D]/10 to-[#29358B]/10 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
            <Image
              src="/logo.png"
              alt="Big Five"
              width={48}
              height={48}
              className="relative h-12 w-12"
              priority
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight text-[#1A1F2B]">
              BIG <span className="text-[#80368D]">FIVE</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#29358B]/60 font-medium">
              Bootcamp Academy
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            href="/bootcamps"
            className="relative px-4 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:text-[#1A1F2B] group"
          >
            Bootcamps
            <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-gradient-to-r from-[#80368D] to-[#29358B] transition-all duration-300 group-hover:left-4 group-hover:w-[calc(100%-32px)]" />
          </Link>
          <Link
            href="/about"
            className="relative px-4 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:text-[#1A1F2B] group"
          >
            À propos
            <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-gradient-to-r from-[#80368D] to-[#29358B] transition-all duration-300 group-hover:left-4 group-hover:w-[calc(100%-32px)]" />
          </Link>
          <Link
            href="/contact"
            className="relative px-4 py-2 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:text-[#1A1F2B] group"
          >
            Contact
            <span className="absolute bottom-0 left-1/2 h-0.5 w-0 bg-gradient-to-r from-[#80368D] to-[#29358B] transition-all duration-300 group-hover:left-4 group-hover:w-[calc(100%-32px)]" />
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 lg:flex">
          <Button 
            variant="ghost" 
            asChild 
            className="font-medium text-[#1A1F2B] hover:bg-[#D0E4F2]/50"
          >
            <Link href="/login">Connexion</Link>
          </Button>
          <Button 
            asChild 
            className="group font-semibold shadow-lg shadow-[#80368D]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#80368D]/30 hover:scale-105 bg-gradient-to-r from-[#80368D] to-[#29358B] hover:from-[#80368D]/90 hover:to-[#29358B]/90"
          >
            <Link href="/bootcamps">
              Découvrir nos bootcamps
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="relative lg:hidden p-2 rounded-lg transition-colors hover:bg-[#D0E4F2]/50"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6 text-[#1A1F2B]" /> : <Menu className="h-6 w-6 text-[#1A1F2B]" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-[#D0E4F2] bg-white/95 backdrop-blur-xl">
          <nav className="flex flex-col gap-1 px-4 py-4">
            <Link
              href="/bootcamps"
              className="rounded-xl px-4 py-3 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] hover:translate-x-1"
              onClick={() => setIsOpen(false)}
            >
              Bootcamps
            </Link>
            <Link
              href="/about"
              className="rounded-xl px-4 py-3 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] hover:translate-x-1"
              onClick={() => setIsOpen(false)}
            >
              À propos
            </Link>
            <Link
              href="/contact"
              className="rounded-xl px-4 py-3 text-sm font-medium text-[#1A1F2B]/70 transition-all duration-300 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] hover:translate-x-1"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            
            <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-[#D0E4F2]">
              <Button 
                variant="outline" 
                asChild 
                className="w-full justify-center border-[#80368D] text-[#80368D] hover:bg-[#80368D]/5"
              >
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  Connexion
                </Link>
              </Button>
              <Button 
                asChild 
                className="w-full justify-center bg-gradient-to-r from-[#80368D] to-[#29358B]"
              >
                <Link href="/bootcamps" onClick={() => setIsOpen(false)}>
                  Découvrir nos bootcamps
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
