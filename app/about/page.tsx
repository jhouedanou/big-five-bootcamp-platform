import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Users, Target, Rocket, Heart } from "lucide-react"

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-950 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-slate-950 to-slate-950" />
                    <div className="container relative mx-auto px-4 text-center">
                        <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
                            Notre Mission
                        </span>
                        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-6">
                            Inspirer la créativité <br /> <span className="text-primary">Africaine</span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            Big Five Bootcamp est né d'un constat simple : les créatifs africains manquent d'outils adaptés pour benchmarker et s'inspirer des meilleures campagnes locales.
                        </p>
                    </div>
                </section>

                {/* Values Section */}
                <section className="py-20 lg:py-32">
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
                                <div key={i} className="p-8 rounded-2xl border border-border bg-card hover:shadow-lg transition-all">
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                    <p className="text-muted-foreground">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Team Section (Placeholder) */}
                <section className="py-20 bg-muted/30">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-12">L'équipe derrière Big Five</h2>
                        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="group">
                                    <div className="bg-slate-200 aspect-square rounded-2xl mb-4 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                    <h3 className="font-bold text-lg">Membre de l'équipe</h3>
                                    <p className="text-primary text-sm">Cofondateur</p>
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
