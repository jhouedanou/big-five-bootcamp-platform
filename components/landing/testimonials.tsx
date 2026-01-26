import { Star, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    id: 1,
    name: "Mariam Touré",
    role: "Social Media Manager",
    company: "Orange Côte d'Ivoire",
    image: "/testimonials/mariam.jpg",
    content: "Le bootcamp Social Media a complètement transformé ma façon de travailler. J'ai enfin les outils et la méthodologie pour créer des stratégies vraiment impactantes. L'approche pratique est exactement ce dont j'avais besoin.",
    rating: 5,
    bootcamp: "Social Media Management Avancé"
  },
  {
    id: 2,
    name: "Kouamé N'Guessan",
    role: "Directeur Marketing",
    company: "Moov Africa",
    image: "/testimonials/kouame.jpg",
    content: "En tant que directeur marketing, je cherchais à comprendre les enjeux du SEO pour mieux piloter mon équipe. Ce bootcamp m'a donné les clés pour prendre des décisions éclairées. Excellent rapport qualité-prix.",
    rating: 5,
    bootcamp: "SEO & Référencement Naturel"
  },
  {
    id: 3,
    name: "Aïcha Diallo",
    role: "Content Manager",
    company: "Wave",
    image: "/testimonials/aicha.jpg",
    content: "Fatou est une formatrice exceptionnelle ! Son expertise en storytelling et sa connaissance du marché africain font toute la différence. Je recommande à 100% le bootcamp Content Marketing.",
    rating: 5,
    bootcamp: "Content Marketing & Storytelling"
  }
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#F2B33D]/20 text-[#CE9D4D] text-sm font-semibold mb-4">
            Témoignages
          </span>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1F2B] mb-6">
            Ils ont laissé leur empreinte
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-[#1A1F2B]/60 font-[family-name:var(--font-body)]">
            Découvrez les retours de professionnels qui ont transformé leur carrière grâce à nos bootcamps.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card 
              key={testimonial.id}
              className="group border-[#D0E4F2] hover:border-[#80368D]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#80368D]/10 overflow-hidden"
            >
              <CardContent className="p-6 relative">
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 h-8 w-8 text-[#D0E4F2] group-hover:text-[#80368D]/20 transition-colors" />
                
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#F2B33D] text-[#F2B33D]" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-[#1A1F2B]/70 leading-relaxed mb-6 font-[family-name:var(--font-body)]">
                  &quot;{testimonial.content}&quot;
                </p>

                {/* Bootcamp tag */}
                <p className="text-xs text-[#80368D] font-medium mb-4 px-2 py-1 rounded-full bg-[#80368D]/10 inline-block">
                  {testimonial.bootcamp}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#D0E4F2]">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#80368D] to-[#29358B] flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1F2B]">{testimonial.name}</p>
                    <p className="text-sm text-[#1A1F2B]/60">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust logos */}
        <div className="mt-20">
          <p className="text-center text-sm font-medium text-[#1A1F2B]/50 uppercase tracking-wider mb-8">
            Ils nous font confiance
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
            {["Orange", "MTN", "Wave", "Moov Africa", "Ecobank"].map((company) => (
              <div 
                key={company} 
                className="h-12 px-6 flex items-center justify-center rounded-lg bg-[#D0E4F2]/50 text-[#29358B] font-semibold text-sm"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
