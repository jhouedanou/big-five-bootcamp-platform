"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Get form data
    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Échec de la connexion", {
          description: error.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect"
            : error.message,
        })
      } else {
        toast.success("Connexion réussie", {
          description: "Content de te revoir !",
        })
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      toast.error("Une erreur est survenue", {
        description: "Veuillez réessayer plus tard",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8 animate-fade-in-up">
            <Link href="/" className="group inline-flex items-center gap-3 transition-all duration-300">
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
                <img src="/logo.png" alt="Big Five Creative Library" className="relative h-10 w-10 rounded-lg" />
              </div>
              <span className="font-[family-name:var(--font-questrial)] text-xl font-bold text-foreground">
                Big Five <span className="text-primary">Creative Library</span>
              </span>
            </Link>
          </div>

          <div className="animate-fade-in-up delay-100">
            <h1 className="font-[family-name:var(--font-montserrat)] text-3xl font-bold text-foreground">
              Content de te revoir !
            </h1>
            <p className="mt-3 text-muted-foreground">
              Connecte-toi pour accéder à ta bibliothèque
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
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

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Mot de passe
                  </Label>
                  <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    className="h-11 pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" className="h-11 w-full shadow-lg shadow-primary/25" disabled={isLoading}>
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-primary hover:text-primary/80">
              Inscription
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D0E4F2] via-white to-[#D0E4F2]">
          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[#80368D]/20 blur-3xl animate-pulse-glow" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[#F2B33D]/20 blur-3xl animate-pulse-glow delay-300" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-[#29358B]/10 blur-3xl animate-pulse-glow delay-500" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#80368D]/20 via-transparent to-transparent" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

          <div className="relative flex h-full flex-col items-center justify-center p-12">
            <div className="max-w-md text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#80368D]/10 px-4 py-1.5 text-sm font-medium text-[#80368D] mb-6">
                <Sparkles className="h-4 w-4 text-[#F2B33D]" />
                Plateforme créative
              </span>
              <h2 className="font-[family-name:var(--font-montserrat)] text-4xl font-bold text-[#1A1F2B]">
                <span>
                  {"L'inspiration créative"}
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#80368D] via-[#29358B] to-[#F2B33D] bg-clip-text text-transparent">
                  à portée de clic
                </span>
              </h2>
              <p className="mt-6 text-lg text-[#1A1F2B]/70">
                Accède à des milliers de campagnes marketing réelles pour booster ta créativité.
              </p>
              <div className="mt-10 grid grid-cols-3 gap-4">
                {[
                  { gradient: "from-[#FFCC00] to-[#FF9500]" },
                  { gradient: "from-[#80368D] to-[#29358B]" },
                  { gradient: "from-[#1DA1F2] to-[#0D8ECF]" },
                ].map((item, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-xl bg-white/80 border border-[#D0E4F2] shadow-lg hover-lift">
                    <div className={`h-full w-full bg-gradient-to-br ${item.gradient} opacity-80`} />
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-10 flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#1A1F2B]">1000+</div>
                  <div className="text-xs text-[#1A1F2B]/60">Campagnes</div>
                </div>
                <div className="h-8 w-px bg-[#D0E4F2]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#1A1F2B]">100+</div>
                  <div className="text-xs text-[#1A1F2B]/60">Marques</div>
                </div>
                <div className="h-8 w-px bg-[#D0E4F2]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#1A1F2B]">15+</div>
                  <div className="text-xs text-[#1A1F2B]/60">Pays</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

