"use client"

import React from "react"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, Sparkles, Check, Shield, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error("Erreur lors de la création du compte", {
          description: data.error || "Veuillez réessayer.",
        })
        return
      }

      toast.success("Compte créé avec succès !", {
        description: "Vérifie ta boîte mail pour confirmer ton compte, puis connecte-toi.",
      })
      router.push("/login")
    } catch (err) {
      toast.error("Une erreur inattendue est survenue", {
        description: "Veuillez réessayer plus tard.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const benefits = [
    "Acces a toute la bibliotheque",
    "Nouveaux contenus ajoutes quotidiennement",
    "Filtres et recherche avances",
    "Annulation possible a tout moment"
  ]

  return (
    <div className="flex min-h-screen">
      {/* Left side - Visual */}
      <div className="relative hidden flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D0E4F2] via-white to-[#D0E4F2]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#80368D]/20 via-transparent to-transparent" />
          <div className="flex h-full flex-col items-center justify-center p-12">
            <div className="max-w-md">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#10B981]/20 px-4 py-1.5 text-sm text-[#10B981] font-medium">
                <Shield className="h-4 w-4" />
                30 jours gratuits, sans CB
              </div>
              
              <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[#1A1F2B]">
                Rejoins des milliers de creatifs africains
              </h2>
              <p className="mt-4 text-lg text-[#1A1F2B]/70">
                Commence ton essai gratuit et decouvre les meilleures campagnes marketing du continent.
              </p>
              
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3 text-[#1A1F2B]">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981]/20">
                      <Check className="h-4 w-4 text-[#10B981]" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="mt-12 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#D0E4F2] text-xs font-medium text-[#29358B]"
                    >
                      {["AB", "CD", "EF", "GH"][i - 1]}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-[#1A1F2B]/80">
                  <span className="font-semibold text-[#1A1F2B]">+2,500</span> marketeurs actifs
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#80368D]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">Big Five</span>
            </Link>
          </div>

          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
              Commence ton essai gratuit
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              30 jours, acces complet, sans CB
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Nom complet
                </Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ton nom complet"
                    className="h-11 pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ton@email.com"
                    className="h-11 pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Mot de passe
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 caracteres"
                    className="h-11 pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
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

              <div className="flex items-start gap-2">
                <Checkbox 
                  id="terms" 
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
                  {"J'accepte les"}{" "}
                  <Link href="/terms" className="text-primary hover:underline">CGU</Link>
                  {" et la "}
                  <Link href="/privacy" className="text-primary hover:underline">politique de confidentialite</Link>
                </Label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="h-11 w-full shadow-lg shadow-primary/25" 
              disabled={isLoading || !acceptTerms}
            >
              {isLoading ? "Creation du compte..." : "Creer mon compte"}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Donnees securisees
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Deja inscrit ?{" "}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
