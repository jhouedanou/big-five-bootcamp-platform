"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, Clock, Bell, Globe, Check, ArrowRight, Loader2, Lock, AlertTriangle, Receipt, Download, FileText, RefreshCw, TrendingUp, CreditCard } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface UserProfile {
  name: string
  email: string
  avatar: string
  status: "subscribed" | "expired" | "none"
  subscriptionEndDate: string
  plan?: string
  monthlyUsage?: number
}

interface PaymentRecord {
  id: string
  ref_command: string
  amount: number
  status: string
  payment_method?: string
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false)

  // User data from Supabase
  const [user, setUser] = useState<UserProfile>({
    name: "",
    email: "",
    avatar: "",
    status: "none",
    subscriptionEndDate: "",
    plan: "Free",
    monthlyUsage: 0,
  })

  // Charger les données utilisateur depuis Supabase
  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push("/login")
        return
      }

      // Charger le profil depuis la table users
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single()

      // Vérifier aussi les paiements confirmés
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, ref_command, amount, created_at, status, payment_method")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (paymentsData) {
        setPayments(paymentsData)
      }

      // Calculer le statut d'abonnement
      let status: "subscribed" | "expired" | "none" = "none"
      let subscriptionEndDate = ""

      const completedPayments = paymentsData?.filter(p => p.status === "completed") || []

      let planName = profile?.plan || "Free"
      let monthlyUsage = 0

      if (profile) {
        const isPremiumPlan = ["premium", "pro", "basic", "agency", "enterprise"].includes(profile.plan?.toLowerCase() || "")
        const isActiveSubscription = profile.subscription_status === "active"
        const hasCompletedPayment = completedPayments.length > 0

        if ((isPremiumPlan && isActiveSubscription) || hasCompletedPayment) {
          status = "subscribed"
          if (profile.subscription_end_date) {
            subscriptionEndDate = format(new Date(profile.subscription_end_date), "d MMMM yyyy", { locale: fr })
          }
        } else if (profile.subscription_status === "expired") {
          status = "expired"
        } else {
          status = "none"
        }

        // Monthly usage from profile if stored
        monthlyUsage = profile.monthly_campaigns_explored || profile.monthly_usage || 0
      }

      const userName = profile?.full_name || profile?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Utilisateur"
      
      setUser({
        name: userName,
        email: authUser.email || "",
        avatar: profile?.avatar_url || authUser.user_metadata?.avatar_url || "",
        status,
        subscriptionEndDate,
        plan: planName,
        monthlyUsage,
      })
    } catch (error: any) {
      if (error?.name === 'AbortError') return
      console.error("Erreur chargement profil:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])

  // Rafraîchir l'historique
  const handleRefreshHistory = async () => {
    setIsRefreshingHistory(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, ref_command, amount, created_at, status, payment_method")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (paymentsData) {
        setPayments(paymentsData)
      }
    } catch (error) {
      console.error("Erreur rafraîchissement historique:", error)
    } finally {
      setIsRefreshingHistory(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <DashboardNavbar />
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#80368D]" />
        </div>
      ) : (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1F2B]">Mon Profil</h1>
        
        {/* Account Info Section */}
        <section className="mt-8 rounded-xl border border-[#D0E4F2] bg-white p-6 shadow-sm">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1F2B]">Informations du compte</h2>
          
          <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#80368D] text-2xl font-bold text-white">
                {user.name.split(" ").map(n => n[0]).join("")}
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-sm text-[#1A1F2B]/60">Nom complet</Label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg bg-[#D0E4F2]/20 px-3 py-2">
                    <Lock className="h-4 w-4 text-[#1A1F2B]/40" />
                    <p className="font-medium text-[#1A1F2B]">{user.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-[#1A1F2B]/40">Ce champ est en lecture seule</p>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">Abonnement</h2>
          
          <div className="mt-4">
            {user.status === "none" && (
              <div className="rounded-lg bg-[#D0E4F2]/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D0E4F2]/50">
                    <CreditCard className="h-5 w-5 text-[#1A1F2B]/60" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D0E4F2] px-2 py-0.5 text-xs font-medium text-[#1A1F2B]">
                      Plan Gratuit
                    </span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Passez à un abonnement payant pour débloquer toutes les fonctionnalités.
                    </p>
                  </div>
                </div>
                <Button asChild className="mt-4 w-full shadow-lg shadow-primary/25 sm:w-auto bg-[#80368D] hover:bg-[#80368D]/90">
                  <Link href="/subscribe">
                    Choisir une formule
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {user.status === "subscribed" && (
              <div className="rounded-lg bg-[#80368D]/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#80368D]/20">
                    <Check className="h-5 w-5 text-[#80368D]" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#80368D] px-2 py-0.5 text-xs font-medium text-white">
                      <Check className="h-3 w-3" />
                      Abonné {user.plan || 'Pro'}
                    </span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {user.subscriptionEndDate ? (
                        <>Votre abonnement est actif jusqu&apos;au <span className="font-semibold text-foreground">{user.subscriptionEndDate}</span></>
                      ) : (
                        <>Votre abonnement Premium est <span className="font-semibold text-[#10B981]">actif</span>. Profitez de tous les contenus !</>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#10B981]/10 px-3 py-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  <span className="text-sm font-medium text-[#10B981]">Accès illimité à toute la bibliothèque</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Monthly Usage Counter — Basic/Pro only */}
        {["Pro", "Basic", "Premium", "Agency", "Enterprise"].includes(user.plan || "") && user.status === "subscribed" && (
          <section className="mt-6 rounded-xl border border-[#80368D]/20 bg-gradient-to-br from-[#80368D]/5 to-[#a855f7]/5 p-6">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1F2B] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#80368D]" />
              Votre activité ce mois
            </h2>
            <div className="mt-6 flex items-end gap-3">
              <span className="font-[family-name:var(--font-heading)] text-6xl font-extrabold bg-gradient-to-r from-[#80368D] to-[#a855f7] bg-clip-text text-transparent">
                {user.monthlyUsage || 0}
              </span>
              <div className="mb-2">
                <p className="text-base font-semibold text-[#1A1F2B]">campagnes explorées</p>
                <p className="text-sm text-[#1A1F2B]/60">ce mois-ci · réinitialise le 1er</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#80368D]/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#80368D] to-[#a855f7] transition-all"
                style={{ width: `${Math.min(100, ((user.monthlyUsage || 0) / 100) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#1A1F2B]/50">
              Ce compteur suit vos consultations de campagnes du mois en cours.
            </p>
          </section>
        )}

        {/* Recent History - Dynamic from Supabase payments */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">Historique récent</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshHistory}
              disabled={isRefreshingHistory}
              className="bg-white border-[#D0E4F2] text-[#1A1F2B]"
            >
              {isRefreshingHistory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Actualiser</span>
            </Button>
          </div>
          
          <div className="mt-4">
            {payments.length > 0 ? (
              <div className="divide-y divide-border">
                {payments.map((payment) => {
                  const date = new Date(payment.created_at)
                  const isCompleted = payment.status === "completed"
                  const now = new Date()
                  const diffMs = now.getTime() - date.getTime()
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                  let dateLabel = ""
                  if (diffHours < 1) dateLabel = "À l'instant"
                  else if (diffHours < 24) dateLabel = `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`
                  else if (diffDays === 1) dateLabel = "Hier"
                  else if (diffDays < 7) dateLabel = `Il y a ${diffDays} jours`
                  else dateLabel = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isCompleted ? "bg-emerald-100" : "bg-amber-100"
                        }`}>
                          <FileText className={`h-4 w-4 ${isCompleted ? "text-emerald-600" : "text-amber-500"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            Paiement {payment.amount?.toLocaleString("fr-FR")} FCFA
                            {payment.payment_method ? ` · ${payment.payment_method}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Réf: {payment.ref_command}
                            {" · "}
                            <span className={isCompleted ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                              {isCompleted ? "Complété" : payment.status === "pending" ? "En attente" : payment.status}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{dateLabel}</span>
                        {isCompleted && (
                          <a
                            href={`/api/payment/receipt/${payment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            Reçu
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Receipt className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
                <p className="mt-1 text-xs text-muted-foreground">Votre historique de paiements apparaîtra ici</p>
              </div>
            )}
          </div>
        </section>

        {/* Preferences — modules non développés */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">Préférences</h2>
          
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Notifications email</p>
                  <p className="text-xs text-muted-foreground">Recevoir des alertes sur les nouveaux contenus</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Bientôt disponible</span>
                <Switch checked={false} disabled />
              </div>
            </div>
            
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Langue</p>
                  <p className="text-xs text-muted-foreground">Langue de {"l'interface"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Bientôt disponible</span>
                <select 
                  value="fr"
                  disabled
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-not-allowed"
                  aria-label="Sélectionner la langue de l'interface"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  Les modules de notifications email et de langue d&apos;interface sont en cours de développement et seront disponibles prochainement.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      )}
    </div>
  )
}
