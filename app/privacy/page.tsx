import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function PrivacyPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            <Navbar />
            <main className="flex-1 py-16 lg:py-24">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold mb-8 text-[#1A1F2B]">Politique de Confidentialité</h1>
                    <div className="prose prose-slate max-w-none">
                        <p className="lead text-lg text-muted-foreground mb-8">
                            Votre vie privée est importante pour nous. La politique de Big Five Creative Library est de respecter votre vie privée concernant toute information que nous pouvons collecter auprès de vous sur notre site web.
                        </p>

                        <h3>1. Informations que nous collectons</h3>
                        <p>
                            Nous pouvons demander des informations personnelles, telles que votre nom, votre adresse email, votre adresse et vos coordonnées de paiement, lorsque vous vous inscrivez à nos services. Nous collectons ces informations uniquement par des moyens légaux et équitables, avec votre connaissance et votre consentement.
                        </p>

                        <h3>2. Utilisation des informations</h3>
                        <p>
                            Nous utilisons les informations collectées pour fournir, exploiter et maintenir notre site web, améliorer, personnaliser et développer notre site web, comprendre et analyser comment vous utilisez notre site web, et développer de nouveaux produits, services, caractéristiques et fonctionnalités.
                        </p>

                        <h3>3. Sécurité des données</h3>
                        <p>
                            Nous valorisons votre confiance dans la fourniture de vos informations personnelles, c'est pourquoi nous nous efforçons d'utiliser des moyens commercialement acceptables pour les protéger. Mais rappelez-vous qu'aucune méthode de transmission sur Internet, ou méthode de stockage électronique n'est sûre à 100 % et fiable, et nous ne pouvons garantir sa sécurité absolue.
                        </p>

                        {/* Add more privacy policy sections */}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
