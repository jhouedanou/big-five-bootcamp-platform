'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Building2, Loader2, CheckCircle2, XCircle, Clock, ArrowLeft, Play, MessageSquare } from "lucide-react"
import Link from "next/link"

interface BrandRequest {
  id: string
  brand_name: string
  brand_url: string | null          // legacy (1er lien)
  brand_urls: string[] | null
  social_networks: string[] | null
  brand_country: string | null      // legacy
  brand_sector: string | null       // legacy
  notes: string | null
  status: string
  admin_notes: string | null
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

const statusOptions = [
  { value: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accepted', label: 'Acceptée', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'En cours', color: 'bg-[#F5F5F5] text-[#0F0F0F]' },
  { value: 'completed', label: 'Terminée', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Refusée', color: 'bg-red-100 text-red-800' },
]

export default function AdminBrandRequestsPage() {
  const [requests, setRequests] = useState<BrandRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/admin/brand-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const updateRequest = async (id: string, status?: string, notes?: string) => {
    setSaving(true)
    try {
      const body: any = { id }
      if (status) body.status = status
      if (notes !== undefined) body.adminNotes = notes

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
      }
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const inProgressCount = requests.filter(r => r.status === 'in_progress' || r.status === 'accepted').length

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
            const currentStatus = statusOptions.find(s => s.value === req.status) || statusOptions[0]
            const isEditing = editingId === req.id

            return (
              <div key={req.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
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

                    {/* Réseaux sociaux cochés */}
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

                    {/* Liens (tableau brand_urls, fallback brand_url) */}
                    {(() => {
                      const urls =
                        req.brand_urls && req.brand_urls.length > 0
                          ? req.brand_urls
                          : req.brand_url ? [req.brand_url] : []
                      if (urls.length === 0) return null
                      return (
                        <ul className="space-y-0.5 mb-2">
                          {urls.map((u, i) => (
                            <li key={i}>
                              <a
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#F2B33D] hover:underline break-all"
                              >
                                🔗 {u}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )
                    })()}

                    {req.notes && <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-3">{req.notes}</p>}

                    {req.admin_notes && !isEditing && (
                      <div className="rounded-lg bg-[#F2B33D]/5 border border-[#F2B33D]/10 p-3 mb-3">
                        <p className="text-xs font-semibold text-[#F2B33D]/60 mb-1">Note admin :</p>
                        <p className="text-sm text-gray-700">{req.admin_notes}</p>
                      </div>
                    )}

                    {/* Form d'édition admin */}
                    {isEditing && (
                      <div className="mt-3 space-y-3 rounded-lg border border-[#F2B33D]/20 p-4 bg-[#F2B33D]/5">
                        <div>
                          <label htmlFor={`note-${req.id}`} className="block text-xs font-semibold text-gray-600 mb-1">Note pour l'utilisateur</label>
                          <textarea
                            id={`note-${req.id}`}
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={2}
                            placeholder="Note visible par l'utilisateur..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F2B33D] resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={saving} className="bg-[#F2B33D] hover:bg-[#F2B33D]/90"
                            onClick={() => updateRequest(req.id, undefined, adminNotes)}>
                            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Enregistrer
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setAdminNotes("") }}>Annuler</Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <select
                      value={req.status}
                      onChange={(e) => updateRequest(req.id, e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium outline-none focus:border-[#F2B33D]"
                      aria-label="Changer le statut"
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => { setEditingId(req.id); setAdminNotes(req.admin_notes || "") }}>
                      <MessageSquare className="h-3 w-3 mr-1" />Répondre
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
