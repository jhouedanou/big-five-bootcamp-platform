import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BootcampCard } from "@/components/bootcamp-card"
import { getFeaturedBootcamps } from "@/lib/bootcamps-data"

export function FeaturedBootcamps() {
  const featuredBootcamps = getFeaturedBootcamps()

  return (
    <section id="featured" className="py-20 sm:py-28 bg-gradient-to-b from-white to-[#D0E4F2]/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#29358B]/10 text-[#29358B] text-sm font-semibold mb-4">
              Nos formations phares
            </span>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1F2B]">
              Bootcamps populaires
            </h2>
            <p className="mt-4 max-w-xl text-lg text-[#1A1F2B]/60 font-[family-name:var(--font-body)]">
              Des formations intensives conçues pour vous donner les compétences les plus demandées du marché digital africain.
            </p>
          </div>
          <Button 
            asChild 
            variant="outline" 
            className="group border-[#80368D] text-[#80368D] hover:bg-[#80368D] hover:text-white self-start sm:self-auto"
          >
            <Link href="/bootcamps">
              Voir tous les bootcamps
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Bootcamp cards grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featuredBootcamps.map((bootcamp) => (
            <BootcampCard 
              key={bootcamp.id} 
              bootcamp={bootcamp} 
              variant="featured" 
            />
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-10 text-center sm:hidden">
          <Button 
            asChild 
            className="w-full bg-gradient-to-r from-[#80368D] to-[#29358B]"
          >
            <Link href="/bootcamps">
              Découvrir tous nos bootcamps
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
