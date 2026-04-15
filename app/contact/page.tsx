"use client"

import React from "react"
import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { HCaptchaWidget, type HCaptchaWidgetRef } from "@/components/hcaptcha-widget"

export default function ContactPage() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        message: "",
    })
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState("")
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const captchaRef = React.useRef<HCaptchaWidgetRef>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!captchaToken) {
            setStatus("error")
            setErrorMessage("Veuillez compléter le captcha")
            return
        }

        setStatus("loading")
        setErrorMessage("")

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, captchaToken }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Une erreur est survenue")
            }

            setStatus("success")
            setFormData({ firstName: "", lastName: "", email: "", message: "" })
            captchaRef.current?.resetCaptcha()
            setCaptchaToken(null)
        } catch (err) {
            setStatus("error")
            setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue")
            captchaRef.current?.resetCaptcha()
            setCaptchaToken(null)
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-[#D0E4F2] to-white">
                    {/* Abstract wave background */}
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-[#80368D]/30 via-transparent to-transparent rounded-full blur-3xl transform rotate-12 scale-150" />
                    </div>

                    <div className="container relative mx-auto px-4 text-center">
                        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-6 text-[#1A1F2B]">
                            On discute ?
                        </h1>
                        <p className=" text-lg text-[#1A1F2B]/70 pt-12 text-center my-8">
                            Une question sur nos offres ? Besoin d'une démo personnalisée ? Notre équipe est là pour vous aider à décoller.
                        </p>
                    </div>
                </section>

                <section className="py-20 -mt-20 relative z-10">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Contact Info Cards */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
                                    <h3 className="font-bold text-xl mb-6">Nos Coordonnées</h3>
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Email</p>
                                                <p className="text-sm text-muted-foreground">contact@bigfive.solutions.com</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <MapPin className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Bureau</p>
                                                <p className="text-sm text-muted-foreground">Abidjan, Côte d'Ivoire<br />Treichville Rue des Carrossiers, Immeuble Habitat Africain</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <Phone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Téléphone</p>
                                                <p className="text-sm text-muted-foreground">+225 07 47 97 06 27</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Form */}
                            <div className="lg:col-span-2">
                                <div className="p-8 rounded-2xl bg-card border border-border shadow-xl">
                                    <h3 className="font-bold text-xl mb-6">Envoyez-nous un message</h3>

                                    {status === "success" && (
                                        <div className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
                                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                                            <p className="text-sm font-medium">Votre message a bien été envoyé ! Nous vous répondrons dans les plus brefs délais.</p>
                                        </div>
                                    )}

                                    {status === "error" && (
                                        <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
                                            <AlertCircle className="h-5 w-5 shrink-0" />
                                            <p className="text-sm font-medium">{errorMessage}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Prénom</label>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full h-12 rounded-lg border border-input bg-background px-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                    placeholder="Jean"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Nom</label>
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full h-12 rounded-lg border border-input bg-background px-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                    placeholder="Kouassi"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Email professionnel</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                className="w-full h-12 rounded-lg border border-input bg-background px-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                placeholder="jean@agence.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Message</label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                                className="w-full min-h-[150px] rounded-lg border border-input bg-background p-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y"
                                                placeholder="Comment pouvons-nous vous aider ?"
                                            />
                                        </div>
                                        <HCaptchaWidget
                                            ref={captchaRef}
                                            onVerify={(token) => setCaptchaToken(token)}
                                            onExpire={() => setCaptchaToken(null)}
                                            className="flex justify-center"
                                        />

                                        <Button
                                            type="submit"
                                            disabled={status === "loading" || !captchaToken}
                                            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25"
                                        >
                                            {status === "loading" ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Envoi en cours...
                                                </>
                                            ) : (
                                                <>
                                                    Envoyer le message
                                                    <Send className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}
