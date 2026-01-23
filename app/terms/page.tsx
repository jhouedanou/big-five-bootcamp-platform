import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function TermsPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            <Navbar />
            <main className="flex-1 py-16 lg:py-24">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold mb-8 text-[#1A1F2B]">Conditions Générales d'Utilisation</h1>
                    <div className="prose prose-slate max-w-none">
                        <p className="lead text-lg text-muted-foreground mb-8">
                            Dernière mise à jour : 22 Janvier 2026.
                        </p>

                        <h3>1. Introduction</h3>
                        <p>
                            Bienvenue sur Big Five Bootcamp. En accédant à notre site web et en utilisant nos services, vous acceptez d'être lié par ces Conditions Générales d'Utilisation (CGU), toutes les lois et réglementations applicables, et vous acceptez d'être responsable du respect des lois locales applicables.
                        </p>

                        <h3>2. Licence d'utilisation</h3>
                        <p>
                            Il est permis de télécharger temporairement une copie des documents (informations ou logiciels) sur le site web de Big Five Bootcamp à des fins de visionnage transitoire personnel et non commercial uniquement. Il s'agit de l'octroi d'une licence, et non d'un transfert de titre.
                        </p>

                        <h3>3. Clause de non-responsabilité</h3>
                        <p>
                            Les documents figurant sur le site web de Big Five Bootcamp sont fournis "tels quels". Big Five Bootcamp ne donne aucune garantie, expresse ou implicite, et rejette et nie par la présente toutes les autres garanties, y compris, sans limitation, les garanties ou conditions implicites de qualité marchande, d'adéquation à un usage particulier, ou de non-violation de la propriété intellectuelle ou autre violation des droits.
                        </p>

                        <h3>4. Limitations</h3>
                        <p>
                            En aucun cas, Big Five Bootcamp ou ses fournisseurs ne pourront être tenus responsables de tout dommage (y compris, sans limitation, les dommages pour perte de données ou de profit, ou en raison d'une interruption d'activité) découlant de l'utilisation ou de l'incapacité d'utiliser les documents sur le site web de Big Five Bootcamp.
                        </p>

                        {/* Add more fake legal text sections as needed */}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
