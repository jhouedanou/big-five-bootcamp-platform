import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { LevelBadge, FormatBadge, DurationBadge, PriceBadge } from "@/components/ui/bootcamp-badges"
import { getBootcampBySlug, formatPrice, getSessionsByBootcamp, formatDateRange } from "@/lib/bootcamps-data"
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle, 
  Target, 
  BookOpen,
  Award,
  AlertCircle,
  ChevronRight
} from "lucide-react"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const bootcamp = getBootcampBySlug(slug)
  
  if (!bootcamp) {
    return { title: "Bootcamp introuvable" }
  }

  return {
    title: `${bootcamp.title} | Big Five Academy`,
    description: bootcamp.shortDescription,
  }
}

export default async function BootcampDetailPage({ params }: Props) {
  const { slug } = await params
  const bootcamp = getBootcampBySlug(slug)

  if (!bootcamp) {
    notFound()
  }

  const sessions = getSessionsByBootcamp(slug)
  const nextSession = sessions.find(s => s.status === "open")

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-[#80368D] via-[#29358B] to-[#0A74C0] pt-12 pb-24">
          {/* Background pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#F2B33D]/10 rounded-full blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="mb-8 flex items-center gap-2 text-sm text-white/60">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/bootcamps" className="hover:text-white transition-colors">Bootcamps</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white">{bootcamp.title}</span>
            </nav>

            <div className="grid gap-12 lg:grid-cols-5">
              {/* Content */}
              <div className="lg:col-span-3">
                {/* Badges */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <DurationBadge duration={bootcamp.duration} className="bg-white/20 text-white" />
                  <LevelBadge level={bootcamp.level} />
                  <FormatBadge format={bootcamp.format} />
                </div>

                {/* Title */}
                <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                  {bootcamp.title}
                </h1>

                {/* Tagline */}
                <p className="text-xl text-[#F2B33D] font-medium mb-6">
                  {bootcamp.tagline}
                </p>

                {/* Description */}
                <p className="text-lg text-white/80 leading-relaxed mb-8 font-[family-name:var(--font-body)]">
                  {bootcamp.longDescription}
                </p>

                {/* Quick stats */}
                <div className="flex flex-wrap gap-6 text-white/80">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#F2B33D]" />
                    <span>{bootcamp.durationHours} heures de formation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#F2B33D]" />
                    <span>Groupe de 15-20 personnes</span>
                  </div>
                </div>
              </div>

              {/* Price Card */}
              <div className="lg:col-span-2">
                <Card className="bg-white shadow-2xl border-0 overflow-hidden">
                  <CardContent className="p-6">
                    {/* Price */}
                    <div className="mb-6">
                      <p className="text-sm text-[#1A1F2B]/60 mb-1">Prix par participant</p>
                      <p className="text-4xl font-bold text-[#80368D]">
                        {formatPrice(bootcamp.price)}
                      </p>
                    </div>

                    {/* Next session */}
                    {nextSession && (
                      <div className="mb-6 p-4 rounded-lg bg-[#D0E4F2]/30 border border-[#D0E4F2]">
                        <p className="text-sm font-semibold text-[#29358B] mb-2">Prochaine session</p>
                        <div className="flex items-center gap-2 text-[#1A1F2B]">
                          <Calendar className="h-4 w-4 text-[#80368D]" />
                          <span className="font-medium">
                            {formatDateRange(nextSession.startDate, nextSession.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[#1A1F2B]/70 mt-1">
                          <MapPin className="h-4 w-4 text-[#80368D]" />
                          <span>{nextSession.city}</span>
                        </div>
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {nextSession.spotsAvailable} places disponibles
                        </p>
                      </div>
                    )}

                    {/* CTA */}
                    <Button 
                      asChild 
                      className="w-full h-12 text-base font-bold bg-gradient-to-r from-[#80368D] to-[#29358B] hover:from-[#80368D]/90 hover:to-[#29358B]/90 shadow-lg shadow-[#80368D]/25"
                    >
                      <Link href={`/bootcamps/${bootcamp.slug}/sessions`}>
                        Choisir ma session
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>

                    {/* Secondary action */}
                    <Button 
                      variant="outline" 
                      asChild 
                      className="w-full mt-3 border-[#80368D] text-[#80368D] hover:bg-[#80368D]/5"
                    >
                      <Link href="/contact">
                        Demander un devis entreprise
                      </Link>
                    </Button>

                    {/* Trust elements */}
                    <div className="mt-6 pt-6 border-t border-[#D0E4F2] space-y-3 text-sm text-[#1A1F2B]/60">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Certificat de formation inclus</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Supports de cours offerts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Accès communauté alumni</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Curved bottom */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden">
            <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto">
              <path d="M0 60L1440 60V30C1200 50 800 0 400 30C200 45 0 60 0 30V60Z" fill="white"/>
            </svg>
          </div>
        </section>

        {/* Challenge Section */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#F2B33D]/20 text-[#CE9D4D] text-sm font-semibold mb-4">
                  {bootcamp.challenge}
                </span>
                <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#1A1F2B] mb-6">
                  Pourquoi ce bootcamp ?
                </h2>
                <p className="text-lg text-[#1A1F2B]/70 leading-relaxed font-[family-name:var(--font-body)]">
                  {bootcamp.challengeDescription}
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#80368D]/10 to-[#29358B]/10 rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-[#80368D] flex items-center justify-center text-white shrink-0">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1F2B] mb-2">Le constat</h3>
                    <p className="text-[#1A1F2B]/70">
                      Les professionnels qui ne se forment pas continuellement risquent d&apos;être dépassés. 
                      Ce bootcamp vous donne les armes pour rester compétitif.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Outcomes Section */}
        <section className="py-16 bg-gradient-to-b from-white to-[#D0E4F2]/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#29358B]/10 text-[#29358B] text-sm font-semibold mb-4">
                Compétences acquises
              </span>
              <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#1A1F2B] mb-4">
                Ce que vous saurez faire
              </h2>
              <p className="text-lg text-[#1A1F2B]/60 max-w-2xl mx-auto font-[family-name:var(--font-body)]">
                À la fin de ce bootcamp, vous maîtriserez les compétences suivantes
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bootcamp.outcomes.map((outcome, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#D0E4F2] hover:border-[#80368D]/30 hover:shadow-lg transition-all"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#80368D] to-[#29358B] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-[#1A1F2B]/80 pt-1">{outcome}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Target Audience */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Target audience */}
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#80368D]/10 text-[#80368D] text-sm font-semibold mb-4">
                  Pour qui ?
                </span>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-[#1A1F2B] mb-6">
                  Ce bootcamp est fait pour vous si...
                </h2>
                <div className="space-y-3">
                  {bootcamp.targetAudience.map((audience, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-[#1A1F2B]/70">{audience}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#F2B33D]/20 text-[#CE9D4D] text-sm font-semibold mb-4">
                  Prérequis
                </span>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-[#1A1F2B] mb-6">
                  Ce qu&apos;il vous faut
                </h2>
                <div className="space-y-3">
                  {bootcamp.prerequisites.map((prereq, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-[#80368D] mt-0.5 shrink-0" />
                      <p className="text-[#1A1F2B]/70">{prereq}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Program Section */}
        <section className="py-16 bg-gradient-to-b from-[#D0E4F2]/20 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#29358B]/10 text-[#29358B] text-sm font-semibold mb-4">
                Programme détaillé
              </span>
              <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#1A1F2B] mb-4">
                {bootcamp.duration} de formation intensive
              </h2>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {bootcamp.program.map((day) => (
                <Card key={day.day} className="border-[#D0E4F2] overflow-hidden">
                  <div className="bg-gradient-to-r from-[#80368D] to-[#29358B] px-6 py-4">
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-white">
                      Jour {day.day}: {day.title}
                    </h3>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    {day.modules.map((module, index) => (
                      <div key={index} className="border-l-2 border-[#80368D]/30 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-[#1A1F2B]">{module.title}</h4>
                          <span className="text-xs text-[#80368D] bg-[#80368D]/10 px-2 py-0.5 rounded-full">
                            {module.duration}
                          </span>
                        </div>
                        <ul className="text-sm text-[#1A1F2B]/60 space-y-1">
                          {module.topics.map((topic, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#80368D]">•</span>
                              {topic}
                            </li>
                          ))}
                        </ul>
                        {module.exercise && (
                          <p className="text-sm text-[#29358B] mt-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span className="font-medium">Exercice:</span> {module.exercise}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#80368D]/10 text-[#80368D] text-sm font-semibold mb-4">
                  Notre approche
                </span>
                <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#1A1F2B] mb-6">
                  {bootcamp.methodology.practiceRatio}% pratique, {bootcamp.methodology.theoryRatio}% théorie
                </h2>
                <p className="text-lg text-[#1A1F2B]/70 leading-relaxed mb-6 font-[family-name:var(--font-body)]">
                  {bootcamp.methodology.approach}
                </p>
                <div className="flex flex-wrap gap-2">
                  {bootcamp.methodology.tools.map((tool, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1.5 rounded-full bg-[#D0E4F2] text-[#29358B] text-sm font-medium"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square max-w-md mx-auto">
                  {/* Practice/Theory visual */}
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <circle cx="100" cy="100" r="90" fill="#D0E4F2" />
                    <path 
                      d={`M 100 100 L 100 10 A 90 90 0 ${bootcamp.methodology.practiceRatio > 50 ? 1 : 0} 1 ${100 + 90 * Math.sin(2 * Math.PI * bootcamp.methodology.practiceRatio / 100)} ${100 - 90 * Math.cos(2 * Math.PI * bootcamp.methodology.practiceRatio / 100)} Z`}
                      fill="url(#practiceGradient)"
                    />
                    <defs>
                      <linearGradient id="practiceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#80368D" />
                        <stop offset="100%" stopColor="#29358B" />
                      </linearGradient>
                    </defs>
                    <text x="100" y="95" textAnchor="middle" className="text-3xl font-bold fill-white">{bootcamp.methodology.practiceRatio}%</text>
                    <text x="100" y="115" textAnchor="middle" className="text-sm fill-white">Pratique</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gradient-to-b from-white to-[#D0E4F2]/20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#F2B33D]/20 text-[#CE9D4D] text-sm font-semibold mb-4">
                FAQ
              </span>
              <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#1A1F2B] mb-4">
                Questions fréquentes
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {bootcamp.faq.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-white rounded-xl border border-[#D0E4F2] px-6"
                >
                  <AccordionTrigger className="text-left font-semibold text-[#1A1F2B] hover:text-[#80368D]">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#1A1F2B]/70">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-[#80368D] to-[#29358B]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-white mb-4">
              Prêt à maîtriser {bootcamp.title.toLowerCase()} ?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto font-[family-name:var(--font-body)]">
              Rejoignez notre prochaine session et transformez votre expertise digitale. 
              Places limitées pour garantir une expérience de qualité.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                asChild 
                className="h-14 px-8 text-base font-bold bg-white text-[#80368D] hover:bg-white/90 shadow-2xl"
              >
                <Link href={`/bootcamps/${bootcamp.slug}/sessions`}>
                  Choisir ma session
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="h-14 px-8 text-base font-semibold border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/contact">
                  Des questions ? Contactez-nous
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
