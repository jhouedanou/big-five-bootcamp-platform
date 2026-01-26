import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, FormatBadge } from "@/components/ui/bootcamp-badges"
import { getBootcampBySlug, getSessionsByBootcamp, formatDateRange, formatPrice } from "@/lib/bootcamps-data"
import { 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Users, 
  ChevronRight,
  Bell,
  User
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
    title: `Sessions - ${bootcamp.title} | Big Five Academy`,
    description: `Choisissez votre session pour le bootcamp ${bootcamp.title}. Plusieurs dates disponibles à Abidjan et dans d'autres villes.`,
  }
}

export default async function SessionsPage({ params }: Props) {
  const { slug } = await params
  const bootcamp = getBootcampBySlug(slug)

  if (!bootcamp) {
    notFound()
  }

  const sessions = getSessionsByBootcamp(slug)
  const openSessions = sessions.filter(s => s.status === "open")
  const fullSessions = sessions.filter(s => s.status === "full")

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gradient-to-b from-white to-[#D0E4F2]/20">
        {/* Header */}
        <section className="bg-white border-b border-[#D0E4F2] pt-8 pb-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-[#1A1F2B]/60">
              <Link href="/" className="hover:text-[#80368D] transition-colors">Accueil</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/bootcamps" className="hover:text-[#80368D] transition-colors">Bootcamps</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={`/bootcamps/${bootcamp.slug}`} className="hover:text-[#80368D] transition-colors">
                {bootcamp.title}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-[#1A1F2B]">Sessions</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#1A1F2B] mb-2">
                  Choisissez votre session
                </h1>
                <p className="text-[#1A1F2B]/60 font-[family-name:var(--font-body)]">
                  {bootcamp.title} • {bootcamp.duration} • {formatPrice(bootcamp.price)}
                </p>
              </div>
              <Button 
                variant="outline" 
                asChild 
                className="border-[#80368D] text-[#80368D] hover:bg-[#80368D]/5 self-start"
              >
                <Link href={`/bootcamps/${bootcamp.slug}`}>
                  Voir le programme
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Sessions List */}
        <section className="py-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Open Sessions */}
            {openSessions.length > 0 && (
              <div className="mb-12">
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                  Sessions disponibles ({openSessions.length})
                </h2>
                
                <div className="space-y-4">
                  {openSessions.map((session) => (
                    <Card 
                      key={session.id}
                      className="border-[#D0E4F2] hover:border-[#80368D]/30 transition-all hover:shadow-lg overflow-hidden"
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row md:items-center">
                          {/* Date highlight */}
                          <div className="bg-gradient-to-br from-[#80368D] to-[#29358B] p-6 text-white md:w-48 text-center">
                            <Calendar className="h-6 w-6 mx-auto mb-2" />
                            <p className="text-lg font-bold">
                              {formatDateRange(session.startDate, session.endDate)}
                            </p>
                          </div>

                          {/* Session details */}
                          <div className="flex-1 p-6">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="space-y-3">
                                {/* Location */}
                                <div className="flex items-center gap-2 text-[#1A1F2B]">
                                  <MapPin className="h-4 w-4 text-[#80368D]" />
                                  <span className="font-medium">{session.city}</span>
                                  <span className="text-[#1A1F2B]/50">•</span>
                                  <span className="text-[#1A1F2B]/60 text-sm">{session.location}</span>
                                </div>

                                {/* Format and trainer */}
                                <div className="flex flex-wrap items-center gap-3">
                                  <FormatBadge format={session.format} />
                                  <div className="flex items-center gap-2 text-sm text-[#1A1F2B]/60">
                                    <User className="h-4 w-4" />
                                    <span>Animé par {session.trainer.name}</span>
                                  </div>
                                </div>

                                {/* Spots */}
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-600 font-medium">
                                    {session.spotsAvailable} places disponibles sur {session.spotsTotal}
                                  </span>
                                </div>
                              </div>

                              {/* CTA */}
                              <Button 
                                asChild 
                                className="bg-gradient-to-r from-[#80368D] to-[#29358B] hover:from-[#80368D]/90 hover:to-[#29358B]/90 shadow-lg shadow-[#80368D]/25"
                              >
                                <Link href={`/checkout?session=${session.id}`}>
                                  Réserver ma place
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Full Sessions */}
            {fullSessions.length > 0 && (
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  Sessions complètes ({fullSessions.length})
                </h2>
                
                <div className="space-y-4">
                  {fullSessions.map((session) => (
                    <Card 
                      key={session.id}
                      className="border-[#D0E4F2] bg-[#D0E4F2]/10 overflow-hidden"
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row md:items-center">
                          {/* Date highlight */}
                          <div className="bg-[#1A1F2B]/10 p-6 text-[#1A1F2B]/50 md:w-48 text-center">
                            <Calendar className="h-6 w-6 mx-auto mb-2" />
                            <p className="text-lg font-bold">
                              {formatDateRange(session.startDate, session.endDate)}
                            </p>
                          </div>

                          {/* Session details */}
                          <div className="flex-1 p-6">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="space-y-3">
                                {/* Location */}
                                <div className="flex items-center gap-2 text-[#1A1F2B]/50">
                                  <MapPin className="h-4 w-4" />
                                  <span className="font-medium">{session.city}</span>
                                  <span>•</span>
                                  <span className="text-sm">{session.location}</span>
                                </div>

                                {/* Status */}
                                <StatusBadge status={session.status} />
                              </div>

                              {/* Notify button */}
                              <Button 
                                variant="outline" 
                                className="border-[#1A1F2B]/20 text-[#1A1F2B]/60 hover:border-[#80368D] hover:text-[#80368D]"
                              >
                                <Bell className="mr-2 h-4 w-4" />
                                Me notifier
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Suggest next session */}
                {openSessions.length > 0 && (
                  <div className="mt-6 p-4 rounded-lg bg-[#F2B33D]/10 border border-[#F2B33D]/30 text-center">
                    <p className="text-sm text-[#1A1F2B]/70">
                      Cette session est complète ? Inscrivez-vous à la{" "}
                      <Link 
                        href={`/checkout?session=${openSessions[0].id}`}
                        className="font-semibold text-[#80368D] hover:underline"
                      >
                        session du {formatDateRange(openSessions[0].startDate, openSessions[0].endDate)}
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* No sessions */}
            {sessions.length === 0 && (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-[#D0E4F2] flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-[#29358B]" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B] mb-2">
                  Aucune session programmée
                </h3>
                <p className="text-[#1A1F2B]/60 mb-6">
                  De nouvelles dates seront bientôt annoncées pour ce bootcamp.
                </p>
                <Button 
                  variant="outline" 
                  className="border-[#80368D] text-[#80368D]"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Me notifier des prochaines dates
                </Button>
              </div>
            )}

            {/* Help section */}
            <div className="mt-12 p-6 rounded-2xl bg-white border border-[#D0E4F2] text-center">
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1F2B] mb-2">
                Besoin d&apos;aide pour choisir ?
              </h3>
              <p className="text-[#1A1F2B]/60 mb-4 font-[family-name:var(--font-body)]">
                Notre équipe est disponible pour répondre à vos questions et vous aider à trouver la session idéale.
              </p>
              <Button 
                variant="outline" 
                asChild 
                className="border-[#29358B] text-[#29358B]"
              >
                <Link href="/contact">
                  Contactez-nous
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
