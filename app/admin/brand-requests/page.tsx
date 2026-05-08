'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Building2, Loader2, ArrowLeft, MessageSquare, GitMerge, CheckSquare, Square, Trash2 } from "lucide-react"
import Link from "next/link"

interface BrandRequest {
  id: string
  brand_name: string
  brand_url: string | null
  brand_urls: string[] | null
  social_networks: string[] | null
  brand_country: string | null
  brand_sector: string | null
  notes: string | null
  status: string
  admin_notes: string | null
  devis_amount: number | null
  devis_currency: string | null
  devis_url: string | null
  devis_sent_at: string | null
  devis_accepted_at: string | null
  paid_at: string | null
  payment_reference: string | null
  next_renewal_at: string | null
  auto_renew: boolean | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  user?: {
    id: string
    name: string
    email: string
    plan: string
  }
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  tiktok: 'TikTok',
}

const STATUS_OPTIONS = [
  { value: 'pending',              label: 'En attente d’analyse', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'quote_in_preparation', label: 'Devis en préparation', color: 'bg-orange-100 text-orange-800' },
  { value: 'quote_sent',           label: 'Devis envoyé',         color: 'bg-indigo-100 text-indigo-800' },
  { value: 'quote_accepted',       label: 'En attente de paiement', color: 'bg-purple-100 text-purple-800' },
  { value: 'in_payment',           label: 'En attente de paiement', color: 'bg-amber-100 text-amber-800' },
  { value: 'in_production',        label: 'En cours de traitement', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed',            label: 'Disponible',           color: 'bg-green-100 text-green-800' },
  { value: 'rejected',             label: 'Refusée',              color: 'bg-red-100 text-red-800' },
  { value: 'cancelled',            label: 'Résiliée',             color: 'bg-gray-200 text-gray-700' },
  // Statuts legacy (compat ascendante)
  { value: 'accepted',             label: 'Acceptée (legacy)',    color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress',          label: 'En cours (legacy)',    color: 'bg-[#F5F5F5] text-[#0F0F0F]' },
]

export default function AdminBrandRequestsPage() {
  const [requests, setRequests] = useState<BrandRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [devisAmount, setDevisAmount] = useState<string>("")
  const [devisUrl, setDevisUrl] = useState<string>("")
  const [nextRenewalAt, setNextRenewalAt] = useState<string>("")
  const [saving, setSaving] = useState(false)

  // Sélection pour fusion
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

  // Suppression d'une demande
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/brand-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const updateRequest = async (
    id: string,
    patch: {
      status?: string
      adminNotes?: string
      devisAmount?: number | null
      devisUrl?: string | null
      nextRenewalAt?: string | null
    } = {},
  ) => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { id }
      if (patch.status !== undefined) body.status = patch.status
      if (patch.adminNotes !== undefined) body.adminNotes = patch.adminNotes
      if (patch.devisAmount !== undefined) body.devisAmount = patch.devisAmount
      if (patch.devisUrl !== undefined) body.devisUrl = patch.devisUrl
      if (patch.nextRenewalAt !== undefined) body.nextRenewalAt = patch.nextRenewalAt

      const res = await fetch('/api/admin/brand-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        setRequests(prev => prev.map(r => r.id === id ? { ...r, ...data.request } : r))
        setEditingId(null)
        setAdminNotes("")
        setDevisAmount("")
        setDevisUrl("")
        setNextRenewalAt("")
      }
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const startEdit = (req: BrandRequest) => {
    setEditingId(req.id)
    setAdminNotes(req.admin_notes || "")
    setDevisAmount(req.devis_amount != null ? String(req.devis_amount) : "")
    setDevisUrl(req.devis_url || "")
    setNextRenewalAt(req.next_renewal_at ? req.next_renewal_at.slice(0, 10) : "")
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setMergeError(null)
  }

  const handleDelete = async (req: BrandRequest) => {
    const label = req.brand_name || 'cette demande'
    const ok = window.confirm(
      `Supprimer définitivement la demande « ${label} » ?\n\n` +
      `Cette action est irréversible. Les notifications liées seront aussi supprimées. ` +
      `Les éventuels paiements restent conservés en base.`
    )
    if (!ok) return

    setDeletingId(req.id)
    try {
      const res = await fetch(`/api/admin/brand-requests?id=${encodeURIComponent(req.id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== req.id))
        setSelected(prev => {
          if (!prev.has(req.id)) return prev
          const next = new Set(prev)
          next.delete(req.id)
          return next
        })
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || 'Erreur lors de la suppression.')
      }
    } catch {
      alert('Erreur réseau lors de la suppression.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleMerge = async () => {
    if (selected.size < 2) return
    setMerging(true)
    setMergeError(null)
    try {
      const res = await fetch('/api/admin/brand-requests/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMergeError(data.error || 'Erreur lors de la fusion.')
      } else {
        setSelected(new Set())
        await loadRequests()
      }
    } catch {
      setMergeError('Erreur réseau.')
    } finally {
      setMerging(false)
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const inProgressCount = requests.filter(r => r.status === 'in_progress' || r.status === 'accepted').length

  // Demandes sélectionnées — vérifier même marque / même user
  const selectedRequests = requests.filter(r => selected.has(r.id))
  const sameUser = selectedRequests.length > 1
    && new Set(selectedRequests.map(r => r.user?.id)).size === 1
  const sameBrand = selectedRequests.length > 1
    && new Set(selectedRequests.map(r => r.brand_name.toLowerCase().trim())).size === 1
  const canMerge = selected.size >= 2 && sameUser

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F2B33D] to-[#a855f7]">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes de suivi de marques</h1>
          <p className="text-sm text-gray-500">
            {pendingCount} en attente · {inProgressCount} en cours · {requests.length} total
          </p>
        </div>
      </div>

      {/* Barre de fusion */}
      {selected.size >= 2 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#80368D]/20 bg-[#80368D]/5 px-4 py-3">
          <GitMerge className="h-5 w-5 text-[#80368D] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#80368D]">
              {selected.size} demandes sélectionnées
            </p>
            {!sameUser && (
              <p className="text-xs text-red-500 mt-0.5">Les demandes doivent appartenir au même utilisateur.</p>
            )}
            {sameUser && !sameBrand && (
              <p className="text-xs text-amber-600 mt-0.5">Attention : les marques sélectionnées sont différentes.</p>
            )}
            {mergeError && <p className="text-xs text-red-500 mt-0.5">{mergeError}</p>}
          </div>
          <Button
            size="sm"
            disabled={!canMerge || merging}
            onClick={handleMerge}
            className="bg-[#80368D] hover:bg-[#80368D]/90 shrink-0"
          >
            {merging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <GitMerge className="h-3 w-3 mr-1" />}
            Fusionner
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setSelected(new Set()); setMergeError(null) }}
            className="shrink-0"
          >
            Annuler
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F2B33D]" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">Aucune demande</h3>
          <p className="text-sm text-gray-500 mt-1">Les demandes de suivi de marques apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const currentStatus = STATUS_OPTIONS.find(s => s.value === req.status) || STATUS_OPTIONS[0]
            const isEditing = editingId === req.id
            const isSelected = selected.has(req.id)

            return (
              <div
                key={req.id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${
                  isSelected ? 'border-[#80368D]/40 ring-2 ring-[#80368D]/20' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Checkbox sélection */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(req.id)}
                    className="mt-0.5 shrink-0 text-gray-400 hover:text-[#80368D] transition-colors"
                    aria-label={isSelected ? "Désélectionner" : "Sélectionner pour fusion"}
                    title={isSelected ? "Désélectionner" : "Sélectionner pour fusion"}
                  >
                    {isSelected
                      ? <CheckSquare className="h-5 w-5 text-[#80368D]" />
                      : <Square className="h-5 w-5" />
                    }
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{req.brand_name}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${currentStatus.color}`}>
                        {currentStatus.label}
                      </span>
                      {req.user && (
                        <span className="text-xs text-gray-500">
                          par <strong>{req.user.name || req.user.email}</strong> ({req.user.plan})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                      {req.brand_country && <span>📍 {req.brand_country}</span>}
                      {req.brand_sector && <span>🏷️ {req.brand_sector}</span>}
                      <span>📅 {new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>

                    {req.social_networks && req.social_networks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {req.social_networks.map((code) => (
                          <span
                            key={code}
                            className="inline-flex items-center rounded-full bg-[#F2B33D]/10 px-2 py-0.5 text-[11px] font-medium text-[#F2B33D]"
                          >
                            {SOCIAL_LABELS[code] || code}
                          </span>
                        ))}
                      </div>
                    )}

                    {(() => {
                      const urls = req.brand_urls?.length ? req.brand_urls : req.brand_url ? [req.brand_url] : []
                      if (!urls.length) return null
                      return (
                        <ul className="space-y-0.5 mb-2">
                          {urls.map((u, i) => (
                            <li key={i}>
                              <a
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#80368D] hover:underline break-all"
                              >
                                🔗 {u}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )
                    })()}

                    {req.notes && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-3">{req.notes}</p>
                    )}

                    {req.admin_notes && !isEditing && (
                      <div className="rounded-lg bg-[#F2B33D]/5 border border-[#F2B33D]/10 p-3 mb-3">
                        <p className="text-xs font-semibold text-[#F2B33D]/60 mb-1">Note admin :</p>
                        <p className="text-sm text-gray-700">{req.admin_notes}</p>
                      </div>
                    )}

                    {!isEditing && (req.devis_amount || req.next_renewal_at) && (
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-3 text-xs text-gray-700 space-y-0.5">
                        {req.devis_amount != null && (
                          <p>
                            <strong>Devis :</strong>{' '}
                            {new Intl.NumberFormat('fr-FR').format(req.devis_amount)} {req.devis_currency || 'XOF'}
                            {req.devis_url && (
                              <> · <a href={req.devis_url} target="_blank" rel="noopener noreferrer" className="text-[#80368D] hover:underline">Voir le PDF</a></>
                            )}
                            {req.devis_accepted_at && <> · <span className="text-green-700">accepté</span></>}
                          </p>
                        )}
                        {req.paid_at && (
                          <p>
                            <strong>Paiement :</strong> {new Date(req.paid_at).toLocaleDateString('fr-FR')}
                            {req.payment_reference && <> · réf. {req.payment_reference}</>}
                          </p>
                        )}
                        {req.next_renewal_at && (
                          <p>
                            <strong>Renouvellement :</strong> {new Date(req.next_renewal_at).toLocaleDateString('fr-FR')}
                            {req.auto_renew === false && <> · <span className="text-red-700">résilié</span></>}
                          </p>
                        )}
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-3 space-y-3 rounded-lg border border-[#F2B33D]/20 p-4 bg-[#F2B33D]/5">
                        <div>
                          <label htmlFor={`note-${req.id}`} className="block text-xs font-semibold text-gray-600 mb-1">
                            Note pour l'utilisateur
                          </label>
                          <textarea
                            id={`note-${req.id}`}
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={2}
                            placeholder="Note visible par l'utilisateur..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F2B33D] resize-none"
                          />
                        </div>

                        {/* Champs Devis */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label htmlFor={`devis-amount-${req.id}`} className="block text-xs font-semibold text-gray-600 mb-1">
                              Montant du devis (XOF)
                            </label>
                            <input
                              id={`devis-amount-${req.id}`}
                              type="number"
                              min="0"
                              step="1000"
                              value={devisAmount}
                              onChange={(e) => setDevisAmount(e.target.value)}
                              placeholder="Ex : 250000"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F2B33D]"
                            />
                          </div>
                          <div>
                            <label htmlFor={`devis-url-${req.id}`} className="block text-xs font-semibold text-gray-600 mb-1">
                              URL du devis (PDF)
                            </label>
                            <input
                              id={`devis-url-${req.id}`}
                              type="url"
                              value={devisUrl}
                              onChange={(e) => setDevisUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F2B33D]"
                            />
                          </div>
                          <div>
                            <label htmlFor={`renewal-${req.id}`} className="block text-xs font-semibold text-gray-600 mb-1">
                              Prochain renouvellement
                            </label>
                            <input
                              id={`renewal-${req.id}`}
                              type="date"
                              value={nextRenewalAt}
                              onChange={(e) => setNextRenewalAt(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F2B33D]"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={saving} className="bg-[#F2B33D] hover:bg-[#F2B33D]/90"
                            onClick={() => updateRequest(req.id, {
                              adminNotes,
                              devisAmount: devisAmount === '' ? null : Number(devisAmount),
                              devisUrl: devisUrl || null,
                              nextRenewalAt: nextRenewalAt ? new Date(nextRenewalAt).toISOString() : null,
                            })}>
                            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Enregistrer
                          </Button>
                          {req.status === 'pending' && devisAmount && (
                            <Button size="sm" variant="outline" disabled={saving}
                              onClick={() => updateRequest(req.id, {
                                status: 'quote_sent',
                                adminNotes,
                                devisAmount: Number(devisAmount),
                                devisUrl: devisUrl || null,
                              })}>
                              Enregistrer & envoyer le devis
                            </Button>
                          )}
                          <Button size="sm" variant="outline"
                            onClick={() => { setEditingId(null); setAdminNotes(""); setDevisAmount(""); setDevisUrl(""); setNextRenewalAt("") }}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <select
                      value={req.status}
                      onChange={(e) => updateRequest(req.id, { status: e.target.value })}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium outline-none focus:border-[#F2B33D]"
                      aria-label="Changer le statut"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => startEdit(req)}>
                      <MessageSquare className="h-3 w-3 mr-1" />Répondre
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={deletingId === req.id}
                      onClick={() => handleDelete(req)}
                      title="Supprimer définitivement cette demande"
                    >
                      {deletingId === req.id
                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        : <Trash2 className="h-3 w-3 mr-1" />}
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
