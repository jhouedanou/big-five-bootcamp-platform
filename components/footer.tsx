"use client";

import Link from "next/link"
import { Facebook, Instagram, Twitter, Linkedin, Heart, ArrowUpRight } from "lucide-react"
import Image from "next/image"
import { LegalModal } from "./legal-modal"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [logoUrl, setLogoUrl] = useState("/logo.png")

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "logo_url")
      .single()
      .then(({ data }) => {
        if (data?.value) setLogoUrl(data.value)
      })
  }, [])

  return (
    <footer className="relative border-t border-[#D0E4F2] bg-gradient-to-b from-white to-[#D0E4F2]/30 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#80368D]/30 to-transparent" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#80368D]/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#F2B33D]/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <Link href="/" className="group inline-flex items-center gap-3 transition-all duration-300">
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-[#80368D]/20 to-[#F2B33D]/20 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
                <Image
                  src={logoUrl}
                  alt="Big Five Creative Library"
                  width={44}
                  height={44}
                  className="relative h-11 w-11 rounded-lg"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1F2B]">
                  Big Five <span className="text-[#80368D]">Creative Library</span>
                </span>
                <span className="text-xs text-[#1A1F2B]/50">L&apos;inspiration créative</span>
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[#1A1F2B]/60">
              Des milliers de campagnes marketing réelles pour inspirer vos prochaines créations.
            </p>
          </div>

          {/* Navigation links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#29358B]">Produit</h3>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/#features" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Fonctionnalités
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/#pricing" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Tarifs
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/dashboard" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Démo
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#29358B]">Entreprise</h3>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/about" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  À propos
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/contact" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Contact
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#29358B]">Legal</h3>
              <nav className="mt-4 flex flex-col gap-3">
                <LegalModal 
                  defaultTab="cgu"
                  trigger={
                    <button className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D] text-left">
                      CGU
                      <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  }
                />
                <LegalModal 
                  defaultTab="cgv"
                  trigger={
                    <button className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D] text-left">
                      CGV
                      <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  }
                />
                <LegalModal 
                  defaultTab="privacy"
                  trigger={
                    <button className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D] text-left">
                      Confidentialité
                      <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  }
                />
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-[#D0E4F2] pt-8 md:flex-row">
          <p className="flex items-center gap-1 text-sm text-[#1A1F2B]/50">
            &copy; {currentYear} Creative Library powered by Big Five.
          </p>

          {/* Social links */}
          <div className="flex items-center gap-2">
            <Link
              href="https://facebook.com"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D0E4F2]/50 text-[#29358B] transition-all duration-300 hover:bg-[#80368D]/20 hover:text-[#80368D] hover:scale-110"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </Link>
            <Link
              href="https://instagram.com"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D0E4F2]/50 text-[#29358B] transition-all duration-300 hover:bg-gradient-to-br hover:from-[#833AB4]/20 hover:via-[#FD1D1D]/20 hover:to-[#FCAF45]/20 hover:text-[#80368D] hover:scale-110"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </Link>
            <Link
              href="https://twitter.com"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D0E4F2]/50 text-[#29358B] transition-all duration-300 hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2] hover:scale-110"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </Link>
            <Link
              href="https://linkedin.com"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D0E4F2]/50 text-[#29358B] transition-all duration-300 hover:bg-[#0A66C2]/20 hover:text-[#0A66C2] hover:scale-110"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
