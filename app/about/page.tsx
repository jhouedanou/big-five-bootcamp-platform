import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Users, Target, Rocket, Heart } from "lucide-react"

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            <Navbar />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-[#D0E4F2] to-white">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(208,228,242,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(208,228,242,0.3)_1px,transparent_1px)] bg-[size:40px_40px]" />
                    <div className="container relative mx-auto px-4 text-center">
                        <span className="inline-block py-1 px-3 rounded-full bg-[#80368D]/10 border border-[#80368D]/20 text-[#80368D] text-sm font-semibold mb-6">
                            Notre Mission
                        </span>
                        <h1 className="font-[family-name:var(--font-heading)] text-4xl lg:text-6xl font-extrabold tracking-tight mb-6 text-[#1A1F2B]">
                            Inspirer la créativité <br /> <span className="text-[#80368D]">Africaine</span>
                        </h1>
                        <p className="text-lg text-[#1A1F2B]/70 max-w-2xl mx-auto">
                            Big Five Bootcamp est né d'un constat simple : les créatifs africains manquent d'outils adaptés pour benchmarker et s'inspirer des meilleures campagnes locales.
                        </p>
                    </div>
                </section>

                {/* Values Section */}
                <section className="py-20 lg:py-32 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: Target,
                                    title: "Excellence",
                                    desc: "Nous ne sélectionnons que le meilleur de la publicité africaine. Pas de remplissage, que de la qualité."
                                },
                                {
                                    icon: UserRound,
                                    title: "Communauté",
                                    desc: "Nous construisons un écosystème où les créatifs peuvent apprendre les uns des autres."
                                },
                                {
                                    icon: Rocket,
                                    title: "Innovation",
                                    desc: "Des outils de pointe pour vous aider à analyser et décrypter les tendances du marché."
                                }
                            ].map((item, i) => (
                                <div key={i} className="p-8 rounded-2xl border border-[#D0E4F2] bg-white hover:shadow-lg transition-all">
                                    <div className="h-12 w-12 rounded-lg bg-[#80368D]/10 flex items-center justify-center text-[#80368D] mb-6">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-[#1A1F2B]">{item.title}</h3>
                                    <p className="text-[#1A1F2B]/70">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Team Section (Placeholder) */}
                <section className="py-20 bg-[#D0E4F2]/20">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold mb-12 text-[#1A1F2B]">L'équipe derrière Big Five</h2>
                        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="group">
                                    <div className="bg-[#D0E4F2] aspect-square rounded-2xl mb-4 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-[#80368D]/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                    <h3 className="font-bold text-lg text-[#1A1F2B]">Membre de l'équipe</h3>
                                    <p className="text-[#80368D] text-sm">Cofondateur</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}

function UserRound(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
    )
}
