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
  XCircle,
  Download,
  Receipt,
  FileText
} from "lucide-react"

interface UserSubscription {
  plan: string
  status: string
  startDate?: string
  endDate?: string
  paymentMethod?: string
  amount?: number
}

interface PaymentRecord {
  id: string
  ref_command: string
  amount: number
  status: string
  payment_method?: string
  created_at: string
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
  const [payments, setPayments] = useState<PaymentRecord[]>([])
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
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single()

          if (profileError) {
            console.warn("Erreur chargement profil:", profileError.message)
          }

          if (profile) {
            setSubscription({
              plan: profile.plan || "Free",
              status: profile.subscription_status || "active",
              startDate: profile.subscription_start_date || null,
              endDate: profile.subscription_end_date || null,
              paymentMethod: undefined, // récupéré depuis la table payments plus bas
            })
          }
        } catch {
          // Table users pas encore configurée
          console.warn("Table users non disponible")
        }

        // Charger les paiements récents
        try {
          const { data: paymentsData } = await supabase
            .from("payments")
            .select("id, ref_command, amount, created_at, status, payment_method")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20)

          if (paymentsData && paymentsData.length > 0) {
            setPayments(paymentsData)
            // Utiliser le dernier paiement complété pour les infos d'abonnement
            const lastCompleted = paymentsData.find((p: PaymentRecord) => p.status === "completed")
            if (lastCompleted) {
              setSubscription(prev => ({
                ...prev,
                amount: lastCompleted.amount,
                paymentMethod: lastCompleted.payment_method
              }))
            }
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

  // État pour le suivi de la demande d'annulation
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancellationRequested, setCancellationRequested] = useState(false)

  // Annuler l'abonnement — crée un enregistrement admin de demande de désactivation
  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir demander l'annulation de votre abonnement ? Un administrateur traitera votre demande. Vous conserverez l'accès jusqu'à la fin de la période en cours."
    )

    if (!confirmed) return

    setIsCancelling(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Créer un enregistrement de demande d'annulation pour l'admin
      const { error } = await supabase
        .from("subscription_cancellation_requests")
        .insert({
          user_id: user.id,
          user_email: user.email,
          current_plan: subscription.plan,
          subscription_end_date: subscription.endDate || null,
          reason: "Demande d'annulation par l'utilisateur",
          status: "pending",
        })

      if (error) {
        // Si la table n'existe pas encore, fallback avec la table notifications
        console.warn("Table subscription_cancellation_requests non disponible, fallback notifications:", error.message)
        
        try {
          await supabase
            .from("notifications")
            .insert({
              user_id: user.id,
              title: "Demande d'annulation d'abonnement",
              message: `L'utilisateur ${user.email} demande l'annulation de son abonnement ${subscription.plan}. Date de fin actuelle: ${subscription.endDate || 'N/A'}.`,
              type: "admin",
              read: false,
            })
        } catch {
          // Dernier recours : on note la demande dans la table users
          await supabase
            .from("users")
            .update({ 
              subscription_status: "cancellation_requested",
            })
            .eq("id", user.id)
        }
      }

      setCancellationRequested(true)

      toast.success("Demande envoyée", {
        description: "Votre demande d'annulation a été transmise à l'administration. Vous conservez l'accès jusqu'à la fin de la période en cours."
      })
    } catch (error) {
      toast.error("Erreur", {
        description: "Impossible d'envoyer la demande d'annulation. Veuillez réessayer."
      })
    } finally {
      setIsCancelling(false)
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

  const isPremium = ["basic","pro"].includes(subscription.plan.toLowerCase())

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-[#F5F5F5]/20">
        <DashboardNavbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#F2B33D]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-[#F5F5F5]/20">
      <DashboardNavbar />
      
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-[#0F0F0F]">
            Paramètres
          </h1>
          <p className="mt-2 text-base font-medium text-[#0F0F0F]/70">
            Gérez votre compte et vos préférences
          </p>
        </div>

        {/* Section Sécurité - Mot de passe */}
        <section className="rounded-2xl border-2 border-[#F5F5F5] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F2B33D] to-[#a855f7] shadow-lg shadow-[#F2B33D]/25">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#0F0F0F]">
                Sécurité
              </h2>
              <p className="text-sm font-medium text-[#0F0F0F]/60">
                Modifier votre mot de passe
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Email (lecture seule) */}
            <div>
              <Label className="text-sm font-semibold text-[#0F0F0F]">
                Email du compte
              </Label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-[#F5F5F5]/30 px-4 py-3">
                <span className="text-base font-medium text-[#0F0F0F]">
                  {userEmail || "Non connecté"}
                </span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <Label htmlFor="newPassword" className="text-sm font-semibold text-[#0F0F0F]">
                Nouveau mot de passe
              </Label>
              <div className="relative mt-1.5">
                <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0F0F0F]/40" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-11 pr-11 text-base border-2 border-[#F5F5F5] focus:border-[#F2B33D]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0F0F0F]/40 hover:text-[#0F0F0F]"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs font-medium text-[#0F0F0F]/50">
                Min. 8 caractères, 1 majuscule, 1 chiffre
              </p>
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#0F0F0F]">
                Confirmer le nouveau mot de passe
              </Label>
              <div className="relative mt-1.5">
                <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0F0F0F]/40" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-11 pr-11 text-base border-2 border-[#F5F5F5] focus:border-[#F2B33D]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0F0F0F]/40 hover:text-[#0F0F0F]"
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
              className="h-12 w-full text-base font-bold bg-[#F2B33D] hover:bg-[#d99a2a] text-white shadow-lg shadow-[#F2B33D]/25 disabled:opacity-50"
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
        <section className="mt-6 rounded-2xl border-2 border-[#F5F5F5] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${
              isPremium 
                ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-400/25" 
                : "bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-400/25"
            }`}>
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#0F0F0F]">
                Abonnement
              </h2>
              <p className="text-sm font-medium text-[#0F0F0F]/60">
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
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#0F0F0F]/60">
                      <Calendar className="h-4 w-4" />
                      Renouvellement le {formatDate(subscription.endDate)}
                    </p>
                  )}
                </div>
              </div>

              {!isPremium && (
                <Link href="/subscribe">
                  <Button className="h-11 px-6 text-sm font-bold bg-[#F2B33D] hover:bg-[#d99a2a] text-white shadow-lg shadow-[#F2B33D]/25">
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
              <h3 className="font-semibold text-[#0F0F0F]">Détails de l'abonnement</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F5F5F5]/20 p-4">
                  <p className="text-sm font-medium text-[#0F0F0F]/60">Date de début</p>
                  <p className="mt-1 text-base font-bold text-[#0F0F0F]">
                    {formatDate(subscription.startDate)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F5F5]/20 p-4">
                  <p className="text-sm font-medium text-[#0F0F0F]/60">Prochaine facturation</p>
                  <p className="mt-1 text-base font-bold text-[#0F0F0F]">
                    {formatDate(subscription.endDate)}
                  </p>
                </div>
                {subscription.paymentMethod && (
                  <div className="rounded-xl bg-[#F5F5F5]/20 p-4">
                    <p className="text-sm font-medium text-[#0F0F0F]/60">Moyen de paiement</p>
                    <p className="mt-1 text-base font-bold text-[#0F0F0F]">
                      {subscription.paymentMethod}
                    </p>
                  </div>
                )}
                {subscription.amount && (
                  <div className="rounded-xl bg-[#F5F5F5]/20 p-4">
                    <p className="text-sm font-medium text-[#0F0F0F]/60">Montant</p>
                    <p className="mt-1 text-base font-bold text-[#0F0F0F]">
                      {subscription.amount.toLocaleString()} FCFA / mois
                    </p>
                  </div>
                )}
              </div>

              {/* Actions abonnement */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#F5F5F5]">
                {subscription.status === "active" && !cancellationRequested && (
                  <Button 
                    variant="outline" 
                    onClick={handleCancelSubscription}
                    disabled={isCancelling}
                    className="border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Annuler l&apos;abonnement
                      </>
                    )}
                  </Button>
                )}
                {cancellationRequested && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 w-full">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Demande d&apos;annulation envoyée</p>
                      <p className="text-xs text-amber-600">Un administrateur traitera votre demande prochainement. Vous conservez l&apos;accès jusqu&apos;à la fin de votre période d&apos;abonnement.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Avantages Premium (pour utilisateurs Free) */}
          {!isPremium && (
            <div className="mt-6">
              <h3 className="font-semibold text-[#0F0F0F] mb-4">Avantages Premium</h3>
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
                    <span className="text-sm font-medium text-[#0F0F0F]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section Historique & Reçus de paiement */}
        <section className="mt-6 rounded-2xl border-2 border-[#F5F5F5] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#0F0F0F]">
                Historique & Reçus
              </h2>
              <p className="text-sm font-medium text-[#0F0F0F]/60">
                Téléchargez vos reçus de paiement
              </p>
            </div>
          </div>

          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => {
                const date = new Date(payment.created_at)
                const isCompleted = payment.status === "completed"
                return (
                  <div
                    key={payment.id}
                    className={`flex items-center justify-between rounded-xl p-4 transition-colors ${
                      isCompleted
                        ? "bg-emerald-50/50 border border-emerald-100"
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isCompleted ? "bg-emerald-100" : "bg-gray-100"
                      }`}>
                        <FileText className={`h-5 w-5 ${isCompleted ? "text-emerald-600" : "text-gray-400"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0F0F0F] truncate">
                          {payment.amount?.toLocaleString("fr-FR")} FCFA
                        </p>
                        <p className="text-xs font-medium text-[#0F0F0F]/50">
                          {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}
                          {payment.payment_method || "Mobile Money"}
                          {" · "}
                          <span className={`font-semibold ${
                            isCompleted ? "text-emerald-600" : "text-amber-600"
                          }`}>
                            {isCompleted ? "Complété" : payment.status === "pending" ? "En attente" : payment.status}
                          </span>
                        </p>
                      </div>
                    </div>

                    {isCompleted && (
                      <a
                        href={`/api/payment/receipt/${payment.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white border-2 border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Reçu
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Receipt className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-[#0F0F0F]/50">
                Aucun paiement enregistré
              </p>
            </div>
          )}
        </section>

        {/* Lien vers le profil */}
        <div className="mt-6 text-center">
          <Link 
            href="/profile" 
            className="text-sm font-semibold text-[#F2B33D] hover:text-[#6b2d76] transition-colors"
          >
            Modifier mes informations de profil →
          </Link>
        </div>
      </div>
    </div>
  )
}
