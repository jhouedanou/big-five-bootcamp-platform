"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Check, X, Minus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const plans = [
    {
        key: "free",
        name: "Découverte",
        description: "Pour explorer la plateforme.",
        monthlyPrice: 0,
        annualPrice: 0,
        cta: "Commencer",
        ctaLink: "/register",
        ctaVariant: "outline" as const,
        highlighted: false,
        badge: null,
        color: "#1A1F2B",
        features: [
            "5 campagnes consultables / mois",
            "Filtres de base",
            "Email hebdomadaire",
        ],
        excluded: [
            "Collections personnalisées",
            "Téléchargement",
            "Suivi de marques",
        ],
    },
    {
        key: "basic",
        name: "Basic",
        description: "Pour les indépendants.",
        monthlyPrice: 4900,
        annualPrice: 49000,
        cta: "Choisir Basic",
        ctaLink: "/subscribe?plan=basic",
        ctaVariant: "default" as const,
        highlighted: false,
        badge: null,
        color: "#1A1F2B",
        features: [
            "Accès illimité à la bibliothèque",
            "Filtres avancés (Secteur, Pays...)",
            "Collections personnalisées",
            "Téléchargement des vidéos",
            "Compteur d'usage mensuel",
        ],
        excluded: [
            "Suivi de marques",
        ],
    },
    {
        key: "pro",
        name: "Pro",
        description: "Pour les créatifs exigeants.",
        monthlyPrice: 9900,
        annualPrice: 99000,
        cta: "Choisir Pro",
        ctaLink: "/subscribe?plan=pro",
        ctaVariant: "default" as const,
        highlighted: true,
        badge: "Populaire",
        color: "#80368D",
        features: [
            "Tout du plan Basic",
            "Recherches illimitées",
            "Suivi de marques",
            "Support prioritaire",
        ],
        excluded: [],
    },
    {
        key: "agency",
        name: "Agence",
        description: "Pour les équipes marketing.",
        monthlyPrice: -1,
        annualPrice: -1,
        cta: "Contacter l'équipe",
        ctaLink: "mailto:contact@bigfiveabidjan.com",
        ctaVariant: "outline" as const,
        highlighted: false,
        badge: null,
        color: "#1A1F2B",
        features: [
            "Tout du plan Pro",
            "Accès multi-comptes",
            "Facturation centralisée",
            "Onboarding dédié",
            "Demande de suivi de marques",
        ],
        excluded: [],
    },
]

const comparisonFeatures = [
    { name: "Accès à la bibliothèque", free: "5/mois", basic: "Illimité", pro: "Illimité", agency: "Illimité" },
    { name: "Filtres de base", free: true, basic: true, pro: true, agency: true },
    { name: "Filtres avancés (Secteur, Pays, Format)", free: false, basic: true, pro: true, agency: true },
    { name: "Collections personnalisées", free: false, basic: true, pro: true, agency: true },
    { name: "Téléchargement des vidéos", free: false, basic: true, pro: true, agency: true },
    { name: "Recherches illimitées", free: false, basic: false, pro: true, agency: true },
    { name: "Suivi de marques", free: false, basic: false, pro: true, agency: true },
    { name: "Support prioritaire", free: false, basic: false, pro: true, agency: true },
    { name: "Accès multi-comptes", free: false, basic: false, pro: false, agency: true },
    { name: "Facturation centralisée", free: false, basic: false, pro: false, agency: true },
    { name: "Onboarding dédié", free: false, basic: false, pro: false, agency: true },
    { name: "Email hebdomadaire", free: true, basic: true, pro: true, agency: true },
]

function formatPrice(price: number): string {
    return new Intl.NumberFormat("fr-FR").format(price)
}

export default function PricingPage() {
    const [isAnnual, setIsAnnual] = useState(false)

    return (
        <div className="flex min-h-screen flex-col bg-white">
            <Navbar />
            <main className="flex-1">
                {/* Hero */}
                <section className="relative py-16 lg:py-28 overflow-hidden bg-gradient-to-b from-[#D0E4F2] to-white">
                    <div className="container relative mx-auto px-4 text-center">
                        <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight mb-4 sm:mb-6 text-[#1A1F2B]">
                            Des tarifs adaptés à <br className="hidden sm:block" /> <span className="text-[#80368D]">votre ambition</span>
                        </h1>
                        <p className="text-base sm:text-lg text-[#1A1F2B]/70 max-w-2xl mx-auto mb-8">
                            Investissez dans votre veille créative et prenez une longueur d{"'"}avance sur la concurrence.
                        </p>

                        {/* Toggle Mensuel / Annuel */}
                        <div className="flex items-center justify-center gap-3">
                            <span className={cn(
                                "text-sm font-semibold transition-colors",
                                !isAnnual ? "text-[#1A1F2B]" : "text-[#1A1F2B]/50"
                            )}>
                                Mensuel
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsAnnual(!isAnnual)}
                                className={cn(
                                    "relative inline-flex h-7 w-[52px] items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#80368D]/50 focus:ring-offset-2",
                                    isAnnual ? "bg-[#80368D]" : "bg-[#D0E4F2]"
                                )}
                                role="switch"
                                aria-checked={isAnnual}
                                aria-label="Basculer entre tarif mensuel et annuel"
                            >
                                <span
                                    className={cn(
                                        "inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-300",
                                        isAnnual ? "translate-x-[28px]" : "translate-x-1"
                                    )}
                                />
                            </button>
                            <span className={cn(
                                "text-sm font-semibold transition-colors",
                                isAnnual ? "text-[#1A1F2B]" : "text-[#1A1F2B]/50"
                            )}>
                                Annuel
                            </span>
                            {isAnnual && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-[#10B981]/10 px-3 py-1 text-xs font-bold text-[#10B981] ring-1 ring-[#10B981]/20">
                                    2 mois offerts
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                {/* Grille tarifaire responsive */}
                <section className="py-12 sm:py-20 -mt-12 sm:-mt-20 relative z-10">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
                            {plans.map((plan) => (
                                <div
                                    key={plan.key}
                                    className={cn(
                                        "rounded-2xl bg-white p-6 sm:p-8 shadow-lg flex flex-col",
                                        plan.highlighted
                                            ? "border-2 border-[#80368D] shadow-2xl shadow-[#80368D]/20 relative lg:-translate-y-4"
                                            : "border border-[#D0E4F2]"
                                    )}
                                >
                                    {plan.badge && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#F2B33D] text-[#1A1F2B] px-4 py-1.5 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                                            {plan.badge}
                                        </div>
                                    )}
                                    <div className={cn("mb-4 sm:mb-6", plan.badge && "mt-2")}>
                                        <h3 className={cn(
                                            "font-bold text-xl mb-1 sm:mb-2",
                                            plan.highlighted ? "text-[#80368D]" : "text-[#1A1F2B]"
                                        )}>
                                            {plan.name}
                                        </h3>
                                        <p className="text-[#1A1F2B]/60 text-sm">{plan.description}</p>
                                    </div>
                                    <div className="mb-2">
                                        {plan.monthlyPrice === 0 ? (
                                            <span className="text-3xl sm:text-4xl font-bold text-[#1A1F2B]">Gratuit</span>
                                        ) : plan.monthlyPrice === -1 ? (
                                            <span className="text-2xl sm:text-3xl font-bold text-[#1A1F2B]">Sur devis</span>
                                        ) : (
                                            <>
                                                <span className={cn(
                                                    "font-bold text-[#1A1F2B]",
                                                    plan.highlighted ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
                                                )}>
                                                    {isAnnual
                                                        ? formatPrice(Math.round(plan.annualPrice / 12))
                                                        : formatPrice(plan.monthlyPrice)
                                                    }
                                                </span>
                                                <span className="text-[#1A1F2B]/60 ml-1 text-sm">XOF / mois</span>
                                            </>
                                        )}
                                    </div>
                                    {plan.monthlyPrice > 0 && (
                                        <p className="text-xs text-[#1A1F2B]/50 mb-4 sm:mb-6">
                                            {isAnnual
                                                ? `soit ${formatPrice(plan.annualPrice)} XOF facturés annuellement`
                                                : `soit ${formatPrice(plan.annualPrice)} XOF / an`
                                            }
                                        </p>
                                    )}
                                    {plan.monthlyPrice <= 0 && <div className="mb-4 sm:mb-6" />}
                                    <Button
                                        asChild
                                        variant={plan.ctaVariant}
                                        className={cn(
                                            "w-full mb-6 sm:mb-8 font-semibold",
                                            plan.highlighted
                                                ? "h-12 text-base font-bold shadow-lg shadow-[#80368D]/25 bg-[#80368D] hover:bg-[#80368D]/90 text-white"
                                                : plan.ctaVariant === "default"
                                                    ? "h-11 bg-[#1A1F2B] hover:bg-[#1A1F2B]/90 text-white"
                                                    : "h-11 border-[#D0E4F2] text-[#1A1F2B]"
                                        )}
                                    >
                                        {plan.ctaLink.startsWith("mailto:") ? (
                                            <a href={plan.ctaLink}>{plan.cta}</a>
                                        ) : (
                                            <Link href={isAnnual && plan.monthlyPrice > 0 ? `${plan.ctaLink}&billing=annual` : plan.ctaLink}>
                                                {plan.cta}
                                            </Link>
                                        )}
                                    </Button>
                                    <ul className="space-y-3 text-sm flex-1">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-2 text-[#1A1F2B]/70">
                                                <Check className="h-4 w-4 text-[#80368D] shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                        {plan.excluded.map((feature) => (
                                            <li key={feature} className="flex items-center gap-2 text-[#1A1F2B]/40">
                                                <X className="h-4 w-4 shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Tableau comparatif */}
                <section className="py-12 sm:py-20 bg-[#D0E4F2]/20">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-8 sm:mb-12">
                            <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1A1F2B] mb-3">
                                Comparez les fonctionnalités
                            </h2>
                            <p className="text-[#1A1F2B]/60 text-sm sm:text-base max-w-xl mx-auto">
                                Trouvez le plan qui correspond à vos besoins.
                            </p>
                        </div>

                        {/* Desktop */}
                        <div className="hidden md:block max-w-5xl mx-auto">
                            <div className="rounded-2xl border border-[#D0E4F2] bg-white shadow-lg overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[#D0E4F2]">
                                            <th className="text-left p-4 sm:p-6 text-sm font-semibold text-[#1A1F2B]/60 w-2/5">Fonctionnalité</th>
                                            <th className="p-4 sm:p-6 text-center text-sm font-bold text-[#1A1F2B]">Découverte</th>
                                            <th className="p-4 sm:p-6 text-center text-sm font-bold text-[#1A1F2B]">Basic</th>
                                            <th className="p-4 sm:p-6 text-center text-sm font-bold text-[#80368D] bg-[#80368D]/5">Pro</th>
                                            <th className="p-4 sm:p-6 text-center text-sm font-bold text-[#1A1F2B]">Agence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonFeatures.map((feature, idx) => (
                                            <tr key={feature.name} className={cn("border-b border-[#D0E4F2]/50", idx % 2 === 0 ? "bg-white" : "bg-[#D0E4F2]/10")}>
                                                <td className="p-4 sm:p-5 text-sm text-[#1A1F2B]/80 font-medium">{feature.name}</td>
                                                {(["free", "basic", "pro", "agency"] as const).map((planKey) => {
                                                    const value = feature[planKey]
                                                    return (
                                                        <td key={planKey} className={cn("p-4 sm:p-5 text-center", planKey === "pro" && "bg-[#80368D]/5")}>
                                                            {typeof value === "boolean" ? (
                                                                value ? <Check className="h-5 w-5 text-[#10B981] mx-auto" /> : <Minus className="h-5 w-5 text-[#1A1F2B]/20 mx-auto" />
                                                            ) : (
                                                                <span className="text-sm font-semibold text-[#1A1F2B]">{value}</span>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden space-y-4 max-w-lg mx-auto">
                            {(["free", "basic", "pro", "agency"] as const).map((planKey) => {
                                const planInfo = plans.find(p => p.key === planKey)!
                                return (
                                    <div key={planKey} className={cn("rounded-xl border bg-white p-5 shadow-sm", planKey === "pro" ? "border-[#80368D] shadow-md" : "border-[#D0E4F2]")}>
                                        <h3 className={cn("font-bold text-lg mb-3", planKey === "pro" ? "text-[#80368D]" : "text-[#1A1F2B]")}>{planInfo.name}</h3>
                                        <ul className="space-y-2.5">
                                            {comparisonFeatures.map((feature) => {
                                                const value = feature[planKey]
                                                const isIncluded = value === true || typeof value === "string"
                                                return (
                                                    <li key={feature.name} className="flex items-center gap-2.5 text-sm">
                                                        {isIncluded ? <Check className="h-4 w-4 text-[#10B981] shrink-0" /> : <Minus className="h-4 w-4 text-[#1A1F2B]/20 shrink-0" />}
                                                        <span className={cn(isIncluded ? "text-[#1A1F2B]/80" : "text-[#1A1F2B]/40")}>
                                                            {feature.name}
                                                            {typeof value === "string" && <span className="ml-1 font-semibold text-[#80368D]">({value})</span>}
                                                        </span>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}
                            </main>
            <Footer />
        </div>
    )
}
