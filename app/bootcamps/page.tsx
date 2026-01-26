import { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BootcampCard } from "@/components/bootcamp-card"
import { bootcamps } from "@/lib/bootcamps-data"
import { LevelBadge, FormatBadge } from "@/components/ui/bootcamp-badges"

export const metadata: Metadata = {
  title: "Nos Bootcamps | Big Five Academy",
  description: "Découvrez nos bootcamps intensifs en marketing digital, SEO, social media et content marketing. Formations professionnelles de 2 jours à Abidjan.",
}

export default function BootcampsPage() {
  const categories = [...new Set(bootcamps.map(b => b.category))]
  
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#80368D]/5 via-white to-[#29358B]/5 pt-16 pb-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#80368D]/10 text-[#80368D] text-sm font-semibold mb-4">
                Formations intensives
              </span>
              <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1F2B] mb-6">
                Nos Bootcamps
              </h1>
              <p className="text-lg text-[#1A1F2B]/60 font-[family-name:var(--font-body)] max-w-2xl mx-auto">
                Des formations intensives de 2 jours pour développer vos compétences digitales. 
                Animées par des experts, conçues pour des résultats concrets.
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b border-[#D0E4F2] bg-white sticky top-20 z-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[#1A1F2B]/60 mr-2">Filtrer par :</span>
              
              {/* Level filters */}
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#80368D] text-white transition-colors">
                  Tous
                </button>
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#D0E4F2] text-[#1A1F2B]/70 hover:bg-[#80368D]/10 hover:text-[#80368D] transition-colors">
                  Débutant
                </button>
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#D0E4F2] text-[#1A1F2B]/70 hover:bg-[#80368D]/10 hover:text-[#80368D] transition-colors">
                  Intermédiaire
                </button>
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#D0E4F2] text-[#1A1F2B]/70 hover:bg-[#80368D]/10 hover:text-[#80368D] transition-colors">
                  Avancé
                </button>
              </div>

              <div className="hidden sm:block w-px h-6 bg-[#D0E4F2]" />

              {/* Format filters */}
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#D0E4F2] text-[#1A1F2B]/70 hover:bg-[#29358B]/10 hover:text-[#29358B] transition-colors">
                  Présentiel
                </button>
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#D0E4F2] text-[#1A1F2B]/70 hover:bg-[#29358B]/10 hover:text-[#29358B] transition-colors">
                  Hybride
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Bootcamps Grid */}
        <section className="py-12 sm:py-16 bg-gradient-to-b from-white to-[#D0E4F2]/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Category sections */}
            {categories.map((category) => {
              const categoryBootcamps = bootcamps.filter(b => b.category === category)
              return (
                <div key={category} className="mb-16 last:mb-0">
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1F2B]">
                      {category}
                    </h2>
                    <div className="flex-1 h-px bg-[#D0E4F2]" />
                    <span className="text-sm text-[#1A1F2B]/50">
                      {categoryBootcamps.length} formation{categoryBootcamps.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryBootcamps.map((bootcamp) => (
                      <BootcampCard 
                        key={bootcamp.id} 
                        bootcamp={bootcamp} 
                        variant="default" 
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-[#1A1F2B]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-white mb-4">
              Besoin d&apos;une formation sur mesure ?
            </h2>
            <p className="text-white/70 mb-8 font-[family-name:var(--font-body)]">
              Nous concevons également des programmes personnalisés pour les entreprises. 
              Contactez-nous pour discuter de vos besoins spécifiques.
            </p>
            <a 
              href="/contact" 
              className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-[#1A1F2B] font-semibold hover:bg-white/90 transition-colors"
            >
              Demander un devis
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
