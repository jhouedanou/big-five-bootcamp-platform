import { Clock, Users, Target, Award } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const benefits = [
  {
    icon: Clock,
    title: "Format intensif 2 jours",
    description: "Des bootcamps concentrés et efficaces. Pas de perte de temps, que de la valeur actionnable.",
    color: "text-[#80368D]",
    bgGradient: "from-[#80368D]/10 to-[#80368D]/5"
  },
  {
    icon: Users,
    title: "Expertise terrain",
    description: "Formateurs expérimentés avec une vraie expertise du marché africain et de ses spécificités.",
    color: "text-[#29358B]",
    bgGradient: "from-[#29358B]/10 to-[#29358B]/5"
  },
  {
    icon: Target,
    title: "Résultats concrets",
    description: "70% de pratique. Vous repartez avec des livrables et compétences directement applicables.",
    color: "text-[#0A74C0]",
    bgGradient: "from-[#0A74C0]/10 to-[#0A74C0]/5"
  },
  {
    icon: Award,
    title: "Réseau professionnel",
    description: "Rejoignez une communauté d'alumni Big Five. Networking et opportunités continues.",
    color: "text-[#F2B33D]",
    bgGradient: "from-[#F2B33D]/10 to-[#F2B33D]/5"
  }
]

export function ValueProposition() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#80368D]/10 text-[#80368D] text-sm font-semibold mb-4">
            Pourquoi Big Five ?
          </span>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1F2B] mb-6">
            Une formation qui fait la différence
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-[#1A1F2B]/60 font-[family-name:var(--font-body)]">
            Nous croyons en une approche pratique et immersive. 
            Nos bootcamps sont conçus pour vous transformer en expert opérationnel.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="group border-[#D0E4F2] hover:border-[#80368D]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#80368D]/10 hover:-translate-y-1 overflow-hidden"
            >
              <CardContent className="p-6 relative">
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <div className="relative">
                  {/* Icon */}
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${benefit.bgGradient} ${benefit.color} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                    <benefit.icon className="h-7 w-7" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1F2B] mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-[#1A1F2B]/60 leading-relaxed font-[family-name:var(--font-body)]">
                    {benefit.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-20 rounded-2xl bg-gradient-to-r from-[#80368D] to-[#29358B] p-8 sm:p-12">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white mb-2">500+</p>
              <p className="text-white/70 font-medium">Professionnels formés</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white mb-2">98%</p>
              <p className="text-white/70 font-medium">Taux de satisfaction</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white mb-2">15+</p>
              <p className="text-white/70 font-medium">Entreprises partenaires</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
