"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Check, X, Minus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import content from "@/lib/homepage-content.json"

const pricingContent = content.pricing

const plans = pricingContent.plans.map((plan) => ({
    ...plan,
    ctaVariant: plan.ctaVariant as "outline" | "default",
}))

const comparisonFeatures = pricingContent.comparison.features as Array<{
    name: string
    free: string | boolean
    basic: string | boolean
    pro: string | boolean
}>

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
                <section className="relative py-16 lg:py-28 overflow-hidden bg-gradient-to-b from-[#F5F5F5] to-white">
                    <div className="container relative mx-auto px-4 flex flex-col items-center">
                        <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight mb-4 sm:mb-6 text-[#0F0F0F]">
                            {pricingContent.hero.title} <br className="hidden sm:block" /> <span className="text-[#F2B33D]">{pricingContent.hero.titleHighlight}</span>
                        </h1>
                        <p className="text-base sm:text-lg text-[#0F0F0F]/70 max-w-2xl mx-auto mb-8 text-center">
                            {pricingContent.hero.subtitle}
                        </p>

                        {/* Toggle Mensuel / Annuel */}
                        <div className="flex items-center justify-center gap-3">
                            <span className={cn(
                                "text-sm font-semibold transition-colors",
                                !isAnnual ? "text-[#0F0F0F]" : "text-[#0F0F0F]/50"
                            )}>
                                {pricingContent.toggle.monthly}
                            </span>
                            {/* eslint-disable-next-line jsx-a11y/aria-proptypes */}
                            <button
                                type="button"
                                onClick={() => setIsAnnual(!isAnnual)}
                                className={cn(
                                    "relative inline-flex h-7 w-[52px] items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/50 focus:ring-offset-2",
                                    isAnnual ? "bg-[#F2B33D]" : "bg-[#F5F5F5]"
                                )}
                                role="switch"
                                aria-checked={isAnnual ? "true" : "false"}
                                aria-label={pricingContent.toggle.ariaLabel}
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
                                isAnnual ? "text-[#0F0F0F]" : "text-[#0F0F0F]/50"
                            )}>
                                {pricingContent.toggle.annual}
                            </span>
                            {isAnnual && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-[#10B981]/10 px-3 py-1 text-xs font-bold text-[#10B981] ring-1 ring-[#10B981]/20">
                                    {pricingContent.toggle.annualBadge}
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                {/* Grille tarifaire responsive */}
                <section className="py-12 sm:py-20 -mt-12 sm:-mt-20 relative z-10">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center items-stretch gap-4 sm:gap-6 max-w-5xl mx-auto">
                            {plans.map((plan) => (
                                <div
                                    key={plan.key}
                                    className={cn(
                                        "relative rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]",
                                        "bg-[#FAF6EE] border border-[#EADFC8]",
                                        plan.highlighted && "shadow-xl lg:-translate-y-4"
                                    )}
                                >
                                    {plan.badge && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C89B4A] text-white px-5 py-1.5 rounded-full text-sm font-semibold shadow-md whitespace-nowrap">
                                            {plan.badge}
                                        </div>
                                    )}
                                    <div className={cn("mb-4 sm:mb-6", plan.badge && "mt-2")}>
                                        <h3 className="font-bold text-xl mb-1 sm:mb-2 text-[#0F0F0F]">
                                            {plan.name}
                                        </h3>
                                        <p className="text-[#0F0F0F]/60 text-sm">{plan.description}</p>
                                    </div>
                                    <div className="mb-2">
                                        {plan.monthlyPrice === 0 ? (
                                            <span className="text-4xl sm:text-5xl font-extrabold text-[#C89B4A] font-[family-name:var(--font-heading)]">{pricingContent.priceLabels.free}</span>
                                        ) : plan.monthlyPrice === -1 ? (
                                            <span className="text-2xl sm:text-3xl font-bold text-[#0F0F0F]">{pricingContent.priceLabels.custom}</span>
                                        ) : (
                                            <>
                                                <span className={cn(
                                                    "font-bold text-[#0F0F0F]",
                                                    plan.highlighted ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
                                                )}>
                                                    {isAnnual
                                                        ? formatPrice(Math.round(plan.annualPrice / 12))
                                                        : formatPrice(plan.monthlyPrice)
                                                    }
                                                </span>
                                                <span className="text-[#0F0F0F]/60 ml-1 text-sm">{pricingContent.priceLabels.perMonth}</span>
                                            </>
                                        )}
                                    </div>
                                    {plan.monthlyPrice > 0 && (
                                        <p className="text-xs text-[#0F0F0F]/50 mb-4 sm:mb-6">
                                            {isAnnual
                                                ? pricingContent.priceLabels.annualBillingTemplate.replace("{amount}", formatPrice(plan.annualPrice))
                                                : pricingContent.priceLabels.annualPerYearTemplate.replace("{amount}", formatPrice(plan.annualPrice))
                                            }
                                        </p>
                                    )}
                                    {plan.monthlyPrice <= 0 && <div className="mb-4 sm:mb-6" />}
                                    <br/>
                                    <Button
                                        asChild
                                        variant={plan.ctaVariant}
                                        className={cn(
                                            "w-full mb-6 sm:mb-8 font-semibold rounded-xl",
                                            plan.highlighted
                                                ? "h-12 text-base font-bold bg-[#C89B4A] hover:bg-[#b8862f] text-white shadow-md"
                                                : plan.ctaVariant === "default"
                                                    ? "h-12 bg-[#0F0F0F] hover:bg-[#0F0F0F]/90 text-white"
                                                    : "h-12 bg-white border border-[#EADFC8] text-[#C89B4A] hover:bg-[#F5EFE0]"
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
                                            <li key={feature} className={cn("flex items-start gap-2 text-[#0F0F0F]/80", plan.boldFeatures?.includes(feature) && "font-bold text-[#0F0F0F]")}>
                                                <Check className="h-4 w-4 text-[#C89B4A] shrink-0 mt-0.5" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                        {plan.excluded.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2 text-[#0F0F0F]/40">
                                                <X className="h-4 w-4 text-[#E11D48] shrink-0 mt-0.5" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Tableau comparatif */}
                <section className="py-12 sm:py-20 bg-[#F5F5F5]/20">
                    <div className="container mx-auto px-4 flex flex-col items-center">
                        <div className="flex flex-col items-center mb-8 sm:mb-12">
                            <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F0F0F] mb-3 text-center">
                                {pricingContent.comparison.title}
                            </h2>
                            <p className="text-[#0F0F0F]/60 text-sm sm:text-base max-w-xl text-center">
                                {pricingContent.comparison.subtitle}
                            </p>
                        </div>

                        {/* Desktop */}
                        <div className="hidden md:block max-w-5xl mx-auto">
                            <div className="rounded-2xl border border-[#F5F5F5] bg-white shadow-lg overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[#F5F5F5]">
                                            <th className="text-left p-4 sm:p-6 text-sm font-semibold text-[#0F0F0F]/60 w-2/5">{pricingContent.comparison.tableHeader}</th>
                                            <th className="p-4 sm:p-6 text-center text-sm font-bold text-[#0F0F0F]">Découverte</th>
                                            <th className="p-4 sm:p-6 text-center text-sm font-bold text-[#0F0F0F]">Basic</th>
                                            <th className="p-4 sm:p-6 text-center text-sm font-bold text-[#F2B33D] bg-[#F2B33D]/5">Pro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonFeatures.map((feature, idx) => (
                                            <tr key={feature.name} className={cn("border-b border-[#F5F5F5]/50", idx % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]/10")}>
                                                <td className="p-4 sm:p-5 text-sm text-[#0F0F0F]/80 font-medium">{feature.name}</td>
                                                {(["free", "basic", "pro"] as const).map((planKey) => {
                                                    const value = feature[planKey]
                                                    return (
                                                        <td key={planKey} className={cn("p-4 sm:p-5 text-center", planKey === "pro" && "bg-[#F2B33D]/5")}>
                                                            {typeof value === "boolean" ? (
                                                                value ? <Check className="h-5 w-5 text-[#C89B4A] mx-auto" /> : <X className="h-5 w-5 text-[#E11D48] mx-auto" />
                                                            ) : (
                                                                <span className="text-sm font-semibold text-[#0F0F0F]">{value}</span>
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
                            {(["free", "basic", "pro"] as const).map((planKey) => {
                                const planInfo = plans.find(p => p.key === planKey)!
                                return (
                                    <div key={planKey} className={cn("rounded-xl border bg-white p-5 shadow-sm", planKey === "pro" ? "border-[#F2B33D] shadow-md" : "border-[#F5F5F5]")}>
                                        <h3 className={cn("font-bold text-lg mb-3", planKey === "pro" ? "text-[#F2B33D]" : "text-[#0F0F0F]")}>{planInfo.name}</h3>
                                        <ul className="space-y-2.5">
                                            {comparisonFeatures.map((feature) => {
                                                const value = feature[planKey]
                                                const isIncluded = value === true || typeof value === "string"
                                                return (
                                                    <li key={feature.name} className="flex items-center gap-2.5 text-sm">
                                                        {isIncluded ? <Check className="h-4 w-4 text-[#C89B4A] shrink-0" /> : <X className="h-4 w-4 text-[#E11D48] shrink-0" />}
                                                        <span className={cn(isIncluded ? "text-[#0F0F0F]/80" : "text-[#0F0F0F]/40")}>
                                                            {feature.name}
                                                            {typeof value === "string" && <span className="ml-1 font-semibold text-[#F2B33D]">({value})</span>}
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
