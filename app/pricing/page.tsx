import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export default function PricingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-950 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
                    <div className="container relative mx-auto px-4 text-center">
                        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-6">
                            Des tarifs adaptés à <br /> <span className="text-primary">votre ambition</span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            Investissez dans votre veille créative et prenez une longueur d'avance sur la concurrence.
                        </p>
                    </div>
                </section>

                <section className="py-20 -mt-20 relative z-10">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Free Tier */}
                            <div className="rounded-2xl border border-border bg-card p-8 shadow-lg flex flex-col">
                                <div className="mb-6">
                                    <h3 className="font-bold text-xl mb-2">Découverte</h3>
                                    <p className="text-muted-foreground text-sm">Pour explorer la plateforme.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-3xl font-bold">Gratuit</span>
                                </div>
                                <Button variant="outline" className="w-full mb-8">
                                    Commencer
                                </Button>
                                <ul className="space-y-4 text-sm flex-1">
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary" />
                                        Accès limité à la bibliothèque
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary" />
                                        Filtres de base
                                    </li>
                                </ul>
                            </div>

                            {/* Pro Tier (Highlighted) */}
                            <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-2xl shadow-primary/20 relative flex flex-col transform md:-translate-y-4">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                                    Recommandé
                                </div>
                                <div className="mb-6">
                                    <h3 className="font-bold text-xl mb-2 text-primary">Pro</h3>
                                    <p className="text-muted-foreground text-sm">Pour les créatifs exigeants.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-4xl font-bold">4 500</span>
                                    <span className="text-muted-foreground ml-2">XOF / mois</span>
                                </div>
                                <Button className="w-full mb-8 font-bold shadow-lg shadow-primary/25">
                                    Choisir l'offre Pro
                                </Button>
                                <ul className="space-y-4 text-sm flex-1">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <strong>Accès illimité</strong> à toutes les campagnes
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        Filtres avancés (Secteur, Format...)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        Téléchargement des vidéos
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        Support prioritaire
                                    </li>
                                </ul>
                            </div>

                            {/* Agency Tier */}
                            <div className="rounded-2xl border border-border bg-card p-8 shadow-lg flex flex-col">
                                <div className="mb-6">
                                    <h3 className="font-bold text-xl mb-2">Agence</h3>
                                    <p className="text-muted-foreground text-sm">Pour les équipes marketing.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-3xl font-bold">Sur devis</span>
                                </div>
                                <Button variant="outline" className="w-full mb-8">
                                    Contacter l'équipe
                                </Button>
                                <ul className="space-y-4 text-sm flex-1">
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary" />
                                        Tout du plan Pro
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary" />
                                        Accès multi-comptes
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary" />
                                        Facturation centralisée
                                    </li>
                                    <li className="flex items-center gap-2 text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary" />
                                        Onboarding dédié
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
