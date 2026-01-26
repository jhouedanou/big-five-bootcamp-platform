import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-br from-[#80368D] via-[#29358B] to-[#0A74C0] relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-64 h-64 bg-[#F2B33D]/10 rounded-full blur-3xl" />
        
        {/* Fingerprint motif */}
        <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-auto opacity-5" viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="2" />
          <circle cx="200" cy="200" r="150" stroke="white" strokeWidth="2" />
          <circle cx="200" cy="200" r="120" stroke="white" strokeWidth="2" />
          <circle cx="200" cy="200" r="90" stroke="white" strokeWidth="2" />
          <circle cx="200" cy="200" r="60" stroke="white" strokeWidth="2" />
          <circle cx="200" cy="200" r="30" stroke="white" strokeWidth="2" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Tagline */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-5 py-2 ring-1 ring-white/20">
          <span className="text-sm font-medium text-white/90">
            Prêt à faire la différence ?
          </span>
        </div>

        {/* Headline */}
        <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
          Prêt à laisser<br />
          <span className="relative inline-block">
            votre empreinte
            <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
              <path d="M2 10C75 2 225 2 298 10" stroke="#F2B33D" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-[#F2B33D]"> ?</span>
        </h2>

        {/* Description */}
        <p className="max-w-2xl mx-auto text-lg text-white/80 mb-10 font-[family-name:var(--font-body)]">
          Rejoignez les 500+ professionnels qui ont déjà transformé leur carrière digitale avec Big Five. 
          Votre prochaine opportunité commence par un bootcamp.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            asChild 
            className="group h-14 px-8 text-base font-bold bg-white text-[#80368D] hover:bg-white/90 shadow-2xl transition-all duration-300 hover:scale-[1.02]"
          >
            <Link href="/bootcamps">
              Choisir mon bootcamp
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            asChild 
            className="group h-14 px-8 text-base font-semibold border-white/30 bg-transparent text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
          >
            <Link href="/contact">
              Nous contacter
            </Link>
          </Button>
        </div>

        {/* Trust elements */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Satisfaction garantie</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Paiement sécurisé</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Communauté alumni</span>
          </div>
        </div>
      </div>
    </section>
  )
}
