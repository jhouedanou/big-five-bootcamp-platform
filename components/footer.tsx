import Link from "next/link"
import { Facebook, Instagram, Linkedin, Heart, ArrowUpRight, MapPin, Phone, Mail } from "lucide-react"
import Image from "next/image"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-[#D0E4F2] bg-gradient-to-b from-white to-[#D0E4F2]/30 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#80368D]/30 to-transparent" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#80368D]/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#29358B]/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <Link href="/" className="group inline-flex items-center gap-3 transition-all duration-300">
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-[#80368D]/20 to-[#29358B]/20 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
                <Image
                  src="/logo.png"
                  alt="Big Five"
                  width={48}
                  height={48}
                  className="relative h-12 w-12"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1F2B]">
                  BIG <span className="text-[#80368D]">FIVE</span>
                </span>
                <span className="text-xs text-[#29358B]/60 font-medium uppercase tracking-wider">
                  Bootcamp Academy
                </span>
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[#1A1F2B]/60 font-[family-name:var(--font-body)]">
              <span className="font-semibold text-[#80368D]">LAISSEZ VOTRE EMPREINTE</span>
              <br />
              Bootcamps intensifs pour professionnels du digital en Afrique.
            </p>
            
            {/* Contact info */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-[#1A1F2B]/60">
                <MapPin className="h-4 w-4 text-[#80368D]" />
                <span>Abidjan, Côte d&apos;Ivoire</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#1A1F2B]/60">
                <Phone className="h-4 w-4 text-[#80368D]" />
                <span>+225 07 07 07 07 07</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#1A1F2B]/60">
                <Mail className="h-4 w-4 text-[#80368D]" />
                <span>contact@bigfive.ci</span>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#29358B]">Bootcamps</h3>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/bootcamps/social-media-management" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Social Media Management
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/bootcamps/seo-referencement" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  SEO & Référencement
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/bootcamps/content-marketing" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Content Marketing
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/bootcamps" className="group flex items-center text-sm font-medium text-[#80368D] transition-colors hover:text-[#29358B]">
                  Voir tous les bootcamps
                  <ArrowUpRight className="ml-1 h-3 w-3 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                <Link href="/#testimonials" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Témoignages
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#29358B]">Légal</h3>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/terms" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Conditions générales
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/privacy" className="group flex items-center text-sm text-[#1A1F2B]/60 transition-colors hover:text-[#80368D]">
                  Confidentialité
                  <ArrowUpRight className="ml-1 h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-[#D0E4F2] pt-8 md:flex-row">
          <p className="flex items-center gap-1 text-sm text-[#1A1F2B]/50">
            © {currentYear} Big Five. Fait avec
            <Heart className="h-4 w-4 text-[#80368D] animate-pulse" />
            à Abidjan, Côte d&apos;Ivoire.
          </p>

          {/* Social links */}
          <div className="flex items-center gap-2">
            <Link
              href="https://facebook.com/bigfiveci"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D0E4F2]/50 text-[#29358B] transition-all duration-300 hover:bg-[#80368D] hover:text-white hover:scale-110"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook className="h-5 w-5" />
            </Link>
            <Link
              href="https://instagram.com/bigfiveci"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D0E4F2]/50 text-[#29358B] transition-all duration-300 hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#FCAF45] hover:text-white hover:scale-110"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="h-5 w-5" />
            </Link>
            <Link
              href="https://linkedin.com/company/bigfiveci"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D0E4F2]/50 text-[#29358B] transition-all duration-300 hover:bg-[#0A66C2] hover:text-white hover:scale-110"
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
