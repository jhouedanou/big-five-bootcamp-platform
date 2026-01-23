import Link from "next/link"
import { Facebook, Instagram, Twitter, Linkedin, Heart, ArrowUpRight } from "lucide-react"
import Image from "next/image"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-white/10 bg-gradient-to-b from-[#0A1F44] to-[#071428] overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <Link href="/" className="group inline-flex items-center gap-3 transition-all duration-300">
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
                <Image
                  src="/logo.png"
                  alt="Big Five Bootcamp"
                  width={44}
                  height={44}
                  className="relative h-11 w-11 rounded-lg"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-white">
                  Big Five <span className="text-primary">Bootcamp</span>
                </span>
                <span className="text-xs text-white/50">L&apos;inspiration créative</span>
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Des milliers de campagnes marketing réelles pour inspirer vos prochaines créations.
            </p>
          </div>

          {/* Navigation links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">Produit</h3>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/#features" className="group flex items-center text-sm text-white/60 transition-colors hover:text-white">
                  Fonctionnalités
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/#pricing" className="group flex items-center text-sm text-white/60 transition-colors hover:text-white">
                  Tarifs
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/dashboard" className="group flex items-center text-sm text-white/60 transition-colors hover:text-white">
                  Démo
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">Entreprise</h3>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/about" className="group flex items-center text-sm text-white/60 transition-colors hover:text-white">
                  À propos
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/contact" className="group flex items-center text-sm text-white/60 transition-colors hover:text-white">
                  Contact
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">Legal</h3>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/terms" className="group flex items-center text-sm text-white/60 transition-colors hover:text-white">
                  CGU
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/privacy" className="group flex items-center text-sm text-white/60 transition-colors hover:text-white">
                  Confidentialité
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 md:flex-row">
          <p className="flex items-center gap-1 text-sm text-white/50">
            {currentYear} Big Five Bootcamp. Fait avec
            <Heart className="h-4 w-4 text-primary animate-pulse" />
            en Afrique.
          </p>

          {/* Social links */}
          <div className="flex items-center gap-2">
            <Link
              href="https://facebook.com"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 transition-all duration-300 hover:bg-primary/20 hover:text-white hover:scale-110"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </Link>
            <Link
              href="https://instagram.com"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 transition-all duration-300 hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#FCAF45] hover:text-white hover:scale-110"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </Link>
            <Link
              href="https://twitter.com"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 transition-all duration-300 hover:bg-[#1DA1F2]/20 hover:text-white hover:scale-110"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </Link>
            <Link
              href="https://linkedin.com"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 transition-all duration-300 hover:bg-[#0A66C2]/20 hover:text-white hover:scale-110"
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
