import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Check, Gift, X } from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            <Navbar />
            <main className="flex-1">
                <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-[#D0E4F2] to-white">
                    <div className="container relative mx-auto px-4 text-center">
                        <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#F2B33D]/30 to-[#F2B33D]/10 px-6 py-3 ring-2 ring-[#F2B33D]/40 shadow-lg">
                            <Gift className="h-6 w-6 text-[#F2B33D]" />
                            <span className="text-lg font-bold text-[#1A1F2B]">
                                Essai gratuit de 14 jours sur le plan Pro — Sans carte bancaire !
                            </span>
                        </div>

                        <h1 className="font-[family-name:var(--font-heading)] text-4xl lg:text-6xl font-extrabold tracking-tight mb-6 text-[#1A1F2B]">
                            Des tarifs adaptés à <br /> <span className="text-[#80368D]">votre ambition</span>
                        </h1>
                        <p className="text-lg text-[#1A1F2B]/70 max-w-2xl mx-auto">
                            Investissez dans votre veille créative et prenez une longueur d{"'"}avance sur la concurrence.
                        </p>
                    </div>
                </section>

                <section className="py-20 -mt-20 relative z-10">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {/* Free Tier */}
                            <div className="rounded-2xl border border-[#D0E4F2] bg-white p-8 shadow-lg flex flex-col">
                                <div className="mb-6">
                                    <h3 className="font-bold text-xl mb-2 text-[#1A1F2B]">Découverte</h3>
                                    <p className="text-[#1A1F2B]/60 text-sm">Pour explorer la plateforme.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-3xl font-bold text-[#1A1F2B]">Gratuit</span>
                                </div>
                                <Button asChild variant="outline" className="w-full mb-8 border-[#D0E4F2] text-[#1A1F2B]">
                                    <Link href="/register">Commencer</Link>
                                </Button>
                                <ul className="space-y-3 text-sm flex-1">
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        5 campagnes consultables / mois
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Filtres de base
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Email hebdomadaire
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/40">
                                        <X className="h-4 w-4 shrink-0" />
                                        Collections personnalisées
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/40">
                                        <X className="h-4 w-4 shrink-0" />
                                        Téléchargement
                                    </li>
                                </ul>
                            </div>

                            {/* Basic Tier */}
                            <div className="rounded-2xl border border-[#D0E4F2] bg-white p-8 shadow-lg flex flex-col">
                                <div className="mb-6">
                                    <h3 className="font-bold text-xl mb-2 text-[#1A1F2B]">Basic</h3>
                                    <p className="text-[#1A1F2B]/60 text-sm">Pour les indépendants.</p>
                                </div>
                                <div className="mb-2">
                                    <span className="text-3xl font-bold text-[#1A1F2B]">4 900</span>
                                    <span className="text-[#1A1F2B]/60 ml-1">XOF / mois</span>
                                </div>
                                <p className="text-xs text-[#1A1F2B]/50 mb-6">soit 49 000 XOF / an</p>
                                <Button asChild className="w-full mb-8 font-semibold h-11 bg-[#1A1F2B] hover:bg-[#1A1F2B]/90 text-white">
                                    <Link href="/subscribe?plan=basic">Choisir Basic</Link>
                                </Button>
                                <ul className="space-y-3 text-sm flex-1">
                                    <li className="flex items-center gap-2 text-[#1A1F2B]">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        <strong>Accès illimité</strong> à la bibliothèque
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Filtres avancés (Secteur, Pays...)
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Collections personnalisées
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Téléchargement des vidéos
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Compteur d{"'"}usage mensuel
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/40">
                                        <X className="h-4 w-4 shrink-0" />
                                        Suivi de marques
                                    </li>
                                </ul>
                            </div>

                            {/* Pro Tier (Highlighted) */}
                            <div className="rounded-2xl border-2 border-[#80368D] bg-white p-8 shadow-2xl shadow-[#80368D]/20 relative flex flex-col transform lg:-translate-y-4">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F2B33D] text-[#1A1F2B] px-4 py-1.5 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                                    14 jours gratuits
                                </div>
                                <div className="mb-6 mt-2">
                                    <h3 className="font-bold text-xl mb-2 text-[#80368D]">Pro</h3>
                                    <p className="text-[#1A1F2B]/60 text-sm">Pour les créatifs exigeants.</p>
                                </div>
                                <div className="mb-2">
                                    <span className="text-4xl font-bold text-[#1A1F2B]">9 900</span>
                                    <span className="text-[#1A1F2B]/60 ml-1">XOF / mois</span>
                                </div>
                                <p className="text-xs text-[#1A1F2B]/50 mb-6">soit 99 000 XOF / an</p>
                                <Button asChild className="w-full mb-8 font-bold shadow-lg shadow-[#80368D]/25 h-12 text-base bg-[#80368D] hover:bg-[#80368D]/90 text-white">
                                    <Link href="/register">Commencer l{"'"}essai gratuit</Link>
                                </Button>
                                <ul className="space-y-3 text-sm flex-1">
                                    <li className="flex items-center gap-2 text-[#1A1F2B]">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        <strong>Tout du plan Basic</strong>
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Recherches illimitées
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Suivi de marques
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Support prioritaire
                                    </li>
                                </ul>
                            </div>

                            {/* Agency Tier */}
                            <div className="rounded-2xl border border-[#D0E4F2] bg-white p-8 shadow-lg flex flex-col">
                                <div className="mb-6">
                                    <h3 className="font-bold text-xl mb-2 text-[#1A1F2B]">Agence</h3>
                                    <p className="text-[#1A1F2B]/60 text-sm">Pour les équipes marketing.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-3xl font-bold text-[#1A1F2B]">Sur devis</span>
                                </div>
                                <Button asChild variant="outline" className="w-full mb-8 border-[#D0E4F2] text-[#1A1F2B]">
                                    <a href="mailto:contact@bigfiveabidjan.com">Contacter l{"'"}équipe</a>
                                </Button>
                                <ul className="space-y-3 text-sm flex-1">
                                    <li className="flex items-center gap-2 text-[#1A1F2B]">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        <strong>Tout du plan Pro</strong>
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Accès multi-comptes
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Facturation centralisée
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]/70">
                                        <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                        Onboarding dédié
                                    </li>
                                    <li className="flex items-center gap-2 text-[#1A1F2B]">
                                        <Check className="h-4 w-4 text-[#F2B33D] shrink-0" />
                                        <strong>Demande de suivi de marques</strong>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}
