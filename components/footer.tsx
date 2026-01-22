import Link from "next/link"
import { Sparkles, Facebook, Instagram, Twitter, Linkedin } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-[#0A1F44]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Big Five Bootcamp" className="h-10 w-10" />
            <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-white">Big Five Bootcamp</span>
          </div>
          
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/about" className="text-sm text-white/70 transition-colors hover:text-white">
              A propos
            </Link>
            <Link href="/contact" className="text-sm text-white/70 transition-colors hover:text-white">
              Contact
            </Link>
            <Link href="/terms" className="text-sm text-white/70 transition-colors hover:text-white">
              CGU
            </Link>
            <Link href="/privacy" className="text-sm text-white/70 transition-colors hover:text-white">
              Confidentialite
            </Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link href="https://facebook.com" className="text-white/70 transition-colors hover:text-white" aria-label="Facebook">
              <Facebook className="h-5 w-5" />
            </Link>
            <Link href="https://instagram.com" className="text-white/70 transition-colors hover:text-white" aria-label="Instagram">
              <Instagram className="h-5 w-5" />
            </Link>
            <Link href="https://twitter.com" className="text-white/70 transition-colors hover:text-white" aria-label="Twitter">
              <Twitter className="h-5 w-5" />
            </Link>
            <Link href="https://linkedin.com" className="text-white/70 transition-colors hover:text-white" aria-label="LinkedIn">
              <Linkedin className="h-5 w-5" />
            </Link>
          </div>
        </div>
        
        <div className="mt-8 border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-white/50">
            2024 Big Five Bootcamp. Tous droits reserves.
          </p>
        </div>
      </div>
    </footer>
  )
}
