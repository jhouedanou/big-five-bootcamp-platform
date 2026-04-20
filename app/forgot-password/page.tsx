
"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Sparkles, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.target as HTMLFormElement)
        const email = formData.get("email") as string

        try {
            // Utiliser l'URL d'origine du navigateur pour éviter les problèmes de domaine
            const baseUrl = window.location.origin
            
            // Poser un cookie pour que le callback sache qu'il s'agit d'un reset password
            // (les query params dans redirectTo peuvent être perdus lors du redirect Supabase)
            document.cookie = 'sb-password-recovery=true; path=/; max-age=3600; samesite=lax'
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${baseUrl}/auth/callback?type=recovery&next=/update-password`,
            })

            if (error) {
                console.error('Reset password error:', error)
                toast.error("Erreur", {
                    description: error.message,
                })
            } else {
                toast.success("Email envoyé !", {
                    description: "Vérifie ta boîte de réception (et les spams) pour réinitialiser ton mot de passe.",
                    duration: 5000,
                })
                // Optional: redirect to login or show confirmation
            }
        } catch (error) {
            console.error('Reset password exception:', error)
            toast.error("Une erreur est survenue", {
                description: "Veuillez réessayer plus tard",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen">
            <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="mb-8">
                        <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Retour à la connexion
                        </Link>
                    </div>

                    <div className="mb-8 animate-fade-in-up">
                        <Link href="/" className="group inline-flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
                                <img src="/logo.png" alt="Laveiye" className="relative h-10 w-10 rounded-lg" />
                            </div>
                            <span className="font-[family-name:var(--font-questrial)] text-xl font-bold text-foreground">
                                Laveiye
                            </span>
                        </Link>
                    </div>

                    <div>
                        <h1 className="font-[family-name:var(--font-montserrat)] text-2xl font-bold text-foreground">
                            Mot de passe oublié ?
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Entre ton email pour recevoir un lien de réinitialisation.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div>
                            <Label htmlFor="email" className="text-sm font-medium text-foreground">
                                Email
                            </Label>
                            <div className="relative mt-1.5">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="ton@email.com"
                                    className="h-11 pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" className="h-11 w-full shadow-lg shadow-primary/25" disabled={isLoading}>
                            {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
                        </Button>
                    </form>
                </div>
            </div>

            {/* Right side - Visual (Simplified) */}
            <div className="relative hidden w-0 flex-1 lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F5F5F5] via-white to-[#F5F5F5]">
                    <div className="flex h-full flex-col items-center justify-center p-12">
                        <div className="max-w-md text-center">
                            <h2 className="font-[family-name:var(--font-montserrat)] text-3xl font-bold text-[#0F0F0F]">
                                Récupère ton accès
                            </h2>
                            <p className="mt-4 text-lg text-[#0F0F0F]/70">
                                Ne t'inquiète pas, ça arrive même aux meilleurs créatifs.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
