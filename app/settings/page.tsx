"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  CreditCard, 
  Crown, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Shield,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  XCircle
} from "lucide-react"

interface UserSubscription {
  plan: string
  status: string
  startDate?: string
  endDate?: string
  paymentMethod?: string
  amount?: number
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // États pour le mot de passe
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  // États utilisateur
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<UserSubscription>({
    plan: "Free",
    status: "active"
  })

  // Charger les informations utilisateur
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push("/login")
          return
        }

        setUserEmail(user.email || null)

        // Charger les infos d'abonnement depuis la table users
        try {
          const { data: profile } = await supabase
            .from("users")
            .select("plan, subscription_status, subscription_start, subscription_end, payment_method")
            .eq("id", user.id)
            .single()

          if (profile) {
            setSubscription({
              plan: profile.plan || "Free",
              status: profile.subscription_status || "active",
              startDate: profile.subscription_start,
              endDate: profile.subscription_end,
              paymentMethod: profile.payment_method,
            })
          }
        } catch {
          // Table users pas encore configurée
          console.warn("Table users non disponible")
        }

        // Charger les paiements récents
        try {
          const { data: payments } = await supabase
            .from("payments")
            .select("amount, created_at, status, payment_method")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1)

          if (payments && payments.length > 0) {
            setSubscription(prev => ({
              ...prev,
              amount: payments[0].amount,
              paymentMethod: payments[0].payment_method
            }))
          }
        } catch {
          console.warn("Table payments non disponible")
        }
      } catch (error) {
        console.error("Erreur chargement utilisateur:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [supabase, router])

  // Validation du mot de passe
  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères" }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: "Le mot de passe doit contenir au moins une majuscule" }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "Le mot de passe doit contenir au moins un chiffre" }
    }
    return { valid: true, message: "" }
  }

  // Changement de mot de passe via Supabase
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validations
    if (newPassword !== confirmPassword) {
      toast.error("Erreur", {
        description: "Les mots de passe ne correspondent pas"
      })
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      toast.error("Mot de passe invalide", {
        description: validation.message
      })
      return
    }

    setIsChangingPassword(true)

    try {
      // Mise à jour du mot de passe via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        if (error.message.includes("should be different")) {
          toast.error("Erreur", {
            description: "Le nouveau mot de passe doit être différent de l'ancien"
          })
        } else {
          toast.error("Erreur", {
            description: error.message
          })
        }
        return
      }

      toast.success("Mot de passe modifié", {
        description: "Votre mot de passe a été mis à jour avec succès"
      })

      // Réinitialiser le formulaire
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      toast.error("Erreur inattendue", {
        description: "Veuillez réessayer plus tard"
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Annuler l'abonnement
  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir annuler votre abonnement ? Vous perdrez l'accès aux fonctionnalités Premium à la fin de la période en cours."
    )

    if (!confirmed) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("users")
        .update({ 
          subscription_status: "cancelled",
          plan: "Free"
        })
        .eq("id", user.id)

      if (error) throw error

      setSubscription(prev => ({
        ...prev,
        status: "cancelled",
        plan: "Free"
      }))

      toast.success("Abonnement annulé", {
        description: "Votre abonnement a été annulé. Vous conservez l'accès jusqu'à la fin de la période."
      })
    } catch (error) {
      toast.error("Erreur", {
        description: "Impossible d'annuler l'abonnement. Veuillez réessayer."
      })
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  const isPremium = subscription.plan.toLowerCase() === "premium"

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-[#D0E4F2]/20">
        <DashboardNavbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#80368D]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-[#D0E4F2]/20">
      <DashboardNavbar />
      
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-[#1A1F2B]">
            Paramètres
          </h1>
          <p className="mt-2 text-base font-medium text-[#1A1F2B]/70">
            Gérez votre compte et vos préférences
          </p>
        </div>

        {/* Section Sécurité - Mot de passe */}
        <section className="rounded-2xl border-2 border-[#D0E4F2] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#80368D] to-[#a855f7] shadow-lg shadow-[#80368D]/25">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B]">
                Sécurité
              </h2>
              <p className="text-sm font-medium text-[#1A1F2B]/60">
                Modifier votre mot de passe
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Email (lecture seule) */}
            <div>
              <Label className="text-sm font-semibold text-[#1A1F2B]">
                Email du compte
              </Label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-[#D0E4F2]/30 px-4 py-3">
                <span className="text-base font-medium text-[#1A1F2B]">
                  {userEmail || "Non connecté"}
                </span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <Label htmlFor="newPassword" className="text-sm font-semibold text-[#1A1F2B]">
                Nouveau mot de passe
              </Label>
              <div className="relative mt-1.5">
                <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1A1F2B]/40" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-11 pr-11 text-base border-2 border-[#D0E4F2] focus:border-[#80368D]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1F2B]/40 hover:text-[#1A1F2B]"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs font-medium text-[#1A1F2B]/50">
                Min. 8 caractères, 1 majuscule, 1 chiffre
              </p>
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#1A1F2B]">
                Confirmer le nouveau mot de passe
              </Label>
              <div className="relative mt-1.5">
                <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1A1F2B]/40" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-11 pr-11 text-base border-2 border-[#D0E4F2] focus:border-[#80368D]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1F2B]/40 hover:text-[#1A1F2B]"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  Les mots de passe ne correspondent pas
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Les mots de passe correspondent
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="h-12 w-full text-base font-bold bg-gradient-to-r from-[#80368D] to-[#a855f7] hover:from-[#6b2d76] hover:to-[#9333ea] text-white shadow-lg shadow-[#80368D]/25 disabled:opacity-50"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Modification en cours...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-5 w-5" />
                  Changer le mot de passe
                </>
              )}
            </Button>
          </form>
        </section>

        {/* Section Abonnement */}
        <section className="mt-6 rounded-2xl border-2 border-[#D0E4F2] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${
              isPremium 
                ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-400/25" 
                : "bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-400/25"
            }`}>
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B]">
                Abonnement
              </h2>
              <p className="text-sm font-medium text-[#1A1F2B]/60">
                Gérez votre plan et facturation
              </p>
            </div>
          </div>

          {/* Statut actuel */}
          <div className={`rounded-xl p-5 ${
            isPremium 
              ? "bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200" 
              : "bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200"
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  isPremium ? "bg-amber-100" : "bg-gray-100"
                }`}>
                  {isPremium ? (
                    <Sparkles className="h-7 w-7 text-amber-600" />
                  ) : (
                    <CreditCard className="h-7 w-7 text-gray-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${isPremium ? "text-amber-700" : "text-gray-700"}`}>
                      Plan {subscription.plan}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      subscription.status === "active" 
                        ? "bg-green-100 text-green-700"
                        : subscription.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {subscription.status === "active" ? "Actif" : 
                       subscription.status === "cancelled" ? "Annulé" : "En attente"}
                    </span>
                  </div>
                  {isPremium && subscription.endDate && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#1A1F2B]/60">
                      <Calendar className="h-4 w-4" />
                      Renouvellement le {formatDate(subscription.endDate)}
                    </p>
                  )}
                </div>
              </div>

              {!isPremium && (
                <Link href="/subscribe">
                  <Button className="h-11 px-6 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25">
                    <Crown className="mr-2 h-4 w-4" />
                    Passer Premium
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Détails de l'abonnement Premium */}
          {isPremium && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-[#1A1F2B]">Détails de l'abonnement</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#D0E4F2]/20 p-4">
                  <p className="text-sm font-medium text-[#1A1F2B]/60">Date de début</p>
                  <p className="mt-1 text-base font-bold text-[#1A1F2B]">
                    {formatDate(subscription.startDate)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#D0E4F2]/20 p-4">
                  <p className="text-sm font-medium text-[#1A1F2B]/60">Prochaine facturation</p>
                  <p className="mt-1 text-base font-bold text-[#1A1F2B]">
                    {formatDate(subscription.endDate)}
                  </p>
                </div>
                {subscription.paymentMethod && (
                  <div className="rounded-xl bg-[#D0E4F2]/20 p-4">
                    <p className="text-sm font-medium text-[#1A1F2B]/60">Moyen de paiement</p>
                    <p className="mt-1 text-base font-bold text-[#1A1F2B]">
                      {subscription.paymentMethod}
                    </p>
                  </div>
                )}
                {subscription.amount && (
                  <div className="rounded-xl bg-[#D0E4F2]/20 p-4">
                    <p className="text-sm font-medium text-[#1A1F2B]/60">Montant</p>
                    <p className="mt-1 text-base font-bold text-[#1A1F2B]">
                      {subscription.amount.toLocaleString()} FCFA / mois
                    </p>
                  </div>
                )}
              </div>

              {/* Actions abonnement */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#D0E4F2]">
                <Link href="/subscribe">
                  <Button variant="outline" className="border-2 border-[#D0E4F2] text-[#1A1F2B] hover:bg-[#D0E4F2]/50">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Changer de plan
                  </Button>
                </Link>
                
                {subscription.status === "active" && (
                  <Button 
                    variant="outline" 
                    onClick={handleCancelSubscription}
                    className="border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Annuler l'abonnement
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Avantages Premium (pour utilisateurs Free) */}
          {!isPremium && (
            <div className="mt-6">
              <h3 className="font-semibold text-[#1A1F2B] mb-4">Avantages Premium</h3>
              <div className="grid gap-3">
                {[
                  "Accès illimité à toutes les campagnes",
                  "Téléchargement des ressources",
                  "Filtres avancés et recherche",
                  "Nouvelles campagnes en avant-première",
                  "Support prioritaire"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-[#1A1F2B]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Lien vers le profil */}
        <div className="mt-6 text-center">
          <Link 
            href="/profile" 
            className="text-sm font-semibold text-[#80368D] hover:text-[#6b2d76] transition-colors"
          >
            Modifier mes informations de profil →
          </Link>
        </div>
      </div>
    </div>
  )
}
