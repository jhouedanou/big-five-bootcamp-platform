import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Mail, Trash2 } from "lucide-react"

export const metadata = {
    title: "Suppression de compte et de données — Laveiye",
    description:
        "Demandez la suppression de votre compte Laveiye et des données personnelles associées.",
}

const SUPPORT_EMAIL = "support@laveiye.com"
const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Demande de suppression de compte Laveiye",
)}&body=${encodeURIComponent(
    "Bonjour,\n\nJe souhaite supprimer mon compte Laveiye ainsi que les données personnelles associées.\n\nAdresse e-mail du compte : \nNom : \n\nMerci de confirmer la suppression.",
)}`

export default function AccountDeletionPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            <Navbar />
            <main className="flex-1 py-16 lg:py-24">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#F2B33D]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#0F0F0F] ring-1 ring-[#F2B33D]/20">
                        <Trash2 className="h-4 w-4 text-[#F2B33D]" />
                        Suppression de compte
                    </div>

                    <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold mb-4 text-[#0F0F0F]">
                        Supprimer mon compte et mes données
                    </h1>
                    <p className="text-sm text-muted-foreground mb-10">
                        Laveiye — édité par BigFiveAbidjan SARL. Cette page explique comment
                        demander la suppression de votre compte et des données personnelles
                        associées, conformément à notre{" "}
                        <a href="/privacy" className="font-semibold text-[#F2B33D] hover:underline">
                            politique de confidentialité
                        </a>
                        .
                    </p>

                    <div className="prose prose-slate max-w-none space-y-3 text-sm leading-relaxed">
                        <h2 className="text-lg font-semibold mt-8 mb-3 text-foreground">
                            Comment demander la suppression
                        </h2>
                        <p>Deux options s&apos;offrent à vous :</p>
                        <ol className="list-decimal pl-6 space-y-2">
                            <li>
                                <strong>Depuis votre espace personnel</strong> : connectez-vous,
                                puis rendez-vous dans «&nbsp;Gérer mon compte&nbsp;» et sélectionnez
                                «&nbsp;Supprimer mon compte&nbsp;».
                            </li>
                            <li>
                                <strong>Par e-mail</strong> : envoyez une demande à{" "}
                                <a
                                    href={`mailto:${SUPPORT_EMAIL}`}
                                    className="font-semibold text-[#F2B33D] hover:underline"
                                >
                                    {SUPPORT_EMAIL}
                                </a>{" "}
                                depuis l&apos;adresse e-mail liée à votre compte, en précisant votre
                                nom et l&apos;adresse du compte concerné.
                            </li>
                        </ol>

                        <div className="not-prose my-8">
                            <Button
                                asChild
                                className="h-11 rounded-lg bg-[#F2B33D] text-sm font-bold text-white shadow-lg shadow-[#F2B33D]/20 hover:bg-[#F2B33D]/90"
                            >
                                <a href={MAILTO}>
                                    <Mail className="h-4 w-4" />
                                    Demander la suppression par e-mail
                                </a>
                            </Button>
                        </div>

                        <h2 className="text-lg font-semibold mt-8 mb-3 text-foreground">
                            Données supprimées
                        </h2>
                        <p>À l&apos;issue de la demande, sont définitivement supprimés :</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>votre compte et vos identifiants de connexion ;</li>
                            <li>vos données d&apos;identification (nom, e-mail, société) ;</li>
                            <li>vos Favoris, Collections et préférences ;</li>
                            <li>votre historique d&apos;utilisation (campagnes consultées, recherches, téléchargements) ;</li>
                            <li>les visuels enregistrés restent sur votre appareil et sont sous votre seul contrôle.</li>
                        </ul>

                        <h2 className="text-lg font-semibold mt-8 mb-3 text-foreground">
                            Données conservées
                        </h2>
                        <p>
                            Certaines données peuvent être conservées lorsque la loi l&apos;impose,
                            notamment les <strong>données de facturation</strong>, archivées pendant
                            la durée légale comptable (jusqu&apos;à 10&nbsp;ans), puis supprimées. Ces
                            données ne sont plus utilisées à d&apos;autres fins.
                        </p>

                        <h2 className="text-lg font-semibold mt-8 mb-3 text-foreground">
                            Délai de traitement
                        </h2>
                        <p>
                            Votre demande est traitée dans un délai maximum de{" "}
                            <strong>30 jours calendaires</strong>. Une confirmation vous est envoyée
                            une fois la suppression effectuée.
                        </p>

                        <h2 className="text-lg font-semibold mt-8 mb-3 text-foreground">Contact</h2>
                        <p>
                            Pour toute question : {" "}
                            <a
                                href={`mailto:${SUPPORT_EMAIL}`}
                                className="font-semibold text-[#F2B33D] hover:underline"
                            >
                                {SUPPORT_EMAIL}
                            </a>{" "}
                            — BigFiveAbidjan SARL, Abidjan, Côte d&apos;Ivoire.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
