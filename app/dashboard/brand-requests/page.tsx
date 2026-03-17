'use client'

import { useState, useEffect } from "react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { Loader2, Building2, Plus, CheckCircle2, Clock, XCircle, AlertTriangle, Lock, Send } from "lucide-react"
import Link from "next/link"

interface BrandRequest {
  id: string
  brand_name: string
  brand_url: string | null
  brand_country: string | null
  brand_sector: string | null
  notes: string | null
  status: string
  admin_notes: string | null
  created_at: string
}

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  accepted: { label: 'Acceptée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  in_progress: { label: 'En cours', color: 'bg-purple-100 text-purple-800', icon: Loader2 },
  completed: { label: 'Terminée', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function BrandRequestsPage() {
  const [requests, setRequests] = useState<BrandRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState("Free")
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Form state
  const [brandName, setBrandName] = useState("")
  const [brandUrl, setBrandUrl] = useState("")
  const [brandCountry, setBrandCountry] = useState("")
  const [brandSector, setBrandSector] = useState("")
  const [notes, setNotes] = useState("")

  const supabase = createClient()
  const isAllowed = ['pro', 'premium', 'agency', 'enterprise'].includes(userPlan.toLowerCase())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: profile } = await supabase
        .from('users')
        .select('plan, subscription_status, trial_end_date')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        const isTrial = profile.subscription_status === 'trial' &&
          profile.trial_end_date && new Date(profile.trial_end_date) > new Date()
        setUserPlan(isTrial ? 'Pro' : (profile.plan || 'Free'))
      }

      // Charger les demandes existantes
      const res = await fetch('/api/brand-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandName.trim()) return
    setSubmitting(true)
    setSuccess(false)

    try {
      const res = await fetch('/api/brand-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, brandUrl, brandCountry, brandSector, notes }),
      })

      if (res.ok) {
        const data = await res.json()
        setRequests(prev => [data.request, ...prev])
        setBrandName("")
        setBrandUrl("")
        setBrandCountry("")
        setBrandSector("")
        setNotes("")
        setShowForm(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000)
      }
    } catch { /* ignore */ } finally { setSubmitting(false) }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F8FB]">
      <DashboardNavbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 pb-12 pt-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#80368D] to-[#a855f7] shadow-lg shadow-[#80368D]/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#1A1F2B]">Suivi de marques</h1>
            </div>
            <p className="text-[#1A1F2B]/60">
              Demandez le suivi d'une marque spécifique. Notre équipe priorisera la curation de contenus pour vos marques.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#80368D]" />
            </div>
          ) : !isAllowed ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0E4F2] bg-white p-12 text-center">
              <Lock className="h-12 w-12 text-[#1A1F2B]/20 mb-4" />
              <h3 className="text-xl font-bold text-[#1A1F2B] mb-2">Fonctionnalité Pro / Agency</h3>
              <p className="text-[#1A1F2B]/60 max-w-md mb-6">
                Le suivi de marques est disponible avec les plans Pro et Agency. Passez à un plan supérieur pour en profiter.
              </p>
              <Link href="/pricing">
                <Button className="bg-[#80368D] hover:bg-[#80368D]/90">Voir les plans</Button>
              </Link>
            </div>
          ) : (
            <>
              {success && (
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <p className="text-sm font-medium text-green-800">
                    Votre demande a été envoyée ! Notre équipe la traitera dans les prochains jours.
                  </p>
                </div>
              )}

              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-[#1A1F2B]/60">
                  {requests.length} demande{requests.length > 1 ? 's' : ''} enregistrée{requests.length > 1 ? 's' : ''}
                </p>
                <Button onClick={() => setShowForm(!showForm)} className="bg-[#80368D] hover:bg-[#80368D]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle demande
                </Button>
              </div>

              {/* Formulaire */}
              {showForm && (
                <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-[#D0E4F2] bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#1A1F2B] mb-4">Demander le suivi d'une marque</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="brandName" className="block text-sm font-medium text-[#1A1F2B]/70 mb-1">Nom de la marque *</label>
                      <input id="brandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Ex: MTN, Orange, Coca-Cola..."
                        className="w-full rounded-lg border border-[#D0E4F2] px-3 py-2 text-sm text-[#1A1F2B] outline-none focus:border-[#80368D] focus:ring-2 focus:ring-[#80368D]/20"
                        required />
                    </div>
                    <div>
                      <label htmlFor="brandUrl" className="block text-sm font-medium text-[#1A1F2B]/70 mb-1">Site web / Page sociale</label>
                      <input id="brandUrl" type="url" value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-[#D0E4F2] px-3 py-2 text-sm text-[#1A1F2B] outline-none focus:border-[#80368D] focus:ring-2 focus:ring-[#80368D]/20" />
                    </div>
                    <div>
                      <label htmlFor="brandCountry" className="block text-sm font-medium text-[#1A1F2B]/70 mb-1">Pays</label>
                      <input id="brandCountry" type="text" value={brandCountry} onChange={(e) => setBrandCountry(e.target.value)}
                        placeholder="Ex: Côte d'Ivoire, Sénégal..."
                        className="w-full rounded-lg border border-[#D0E4F2] px-3 py-2 text-sm text-[#1A1F2B] outline-none focus:border-[#80368D] focus:ring-2 focus:ring-[#80368D]/20" />
                    </div>
                    <div>
                      <label htmlFor="brandSector" className="block text-sm font-medium text-[#1A1F2B]/70 mb-1">Secteur</label>
                      <input id="brandSector" type="text" value={brandSector} onChange={(e) => setBrandSector(e.target.value)}
                        placeholder="Ex: Telecoms, FMCG, Banque..."
                        className="w-full rounded-lg border border-[#D0E4F2] px-3 py-2 text-sm text-[#1A1F2B] outline-none focus:border-[#80368D] focus:ring-2 focus:ring-[#80368D]/20" />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="notes" className="block text-sm font-medium text-[#1A1F2B]/70 mb-1">Notes / Contexte</label>
                      <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Précisez votre besoin : types de campagnes recherchés, période, brief client..."
                        rows={3}
                        className="w-full rounded-lg border border-[#D0E4F2] px-3 py-2 text-sm text-[#1A1F2B] outline-none focus:border-[#80368D] focus:ring-2 focus:ring-[#80368D]/20 resize-none" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button type="submit" disabled={submitting || !brandName.trim()} className="bg-[#80368D] hover:bg-[#80368D]/90">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Envoyer la demande
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                  </div>
                </form>
              )}

              {/* Liste des demandes */}
              {requests.length === 0 && !showForm ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0E4F2] bg-white p-12 text-center">
                  <Building2 className="h-12 w-12 text-[#1A1F2B]/20 mb-4" />
                  <h3 className="text-lg font-bold text-[#1A1F2B] mb-2">Aucune demande</h3>
                  <p className="text-sm text-[#1A1F2B]/60 max-w-md mb-4">
                    Vous n'avez pas encore demandé de suivi de marque. Commencez par ajouter une marque que vous souhaitez suivre.
                  </p>
                  <Button onClick={() => setShowForm(true)} className="bg-[#80368D] hover:bg-[#80368D]/90">
                    <Plus className="h-4 w-4 mr-2" />Nouvelle demande
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const statusInfo = statusLabels[req.status] || statusLabels.pending
                    const StatusIcon = statusInfo.icon
                    return (
                      <div key={req.id} className="rounded-xl border border-[#D0E4F2] bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-[#1A1F2B]">{req.brand_name}</h3>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-[#1A1F2B]/60">
                              {req.brand_country && <span>📍 {req.brand_country}</span>}
                              {req.brand_sector && <span>🏷️ {req.brand_sector}</span>}
                              {req.brand_url && <a href={req.brand_url} target="_blank" rel="noopener noreferrer" className="text-[#80368D] hover:underline">🔗 Site web</a>}
                            </div>
                            {req.notes && <p className="mt-2 text-sm text-[#1A1F2B]/70">{req.notes}</p>}
                            {req.admin_notes && (
                              <div className="mt-2 rounded-lg bg-[#D0E4F2]/30 p-3">
                                <p className="text-xs font-semibold text-[#1A1F2B]/60 mb-1">Réponse de l'équipe :</p>
                                <p className="text-sm text-[#1A1F2B]">{req.admin_notes}</p>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-[#1A1F2B]/40 shrink-0">
                            {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
