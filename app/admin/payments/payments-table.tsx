'use client'

import { useMemo, useState } from 'react'
import { Search, ExternalLink } from 'lucide-react'

export type PaymentRow = {
  id: string
  ref_command: string | null
  user_email: string | null
  amount: number | null
  final_amount: number | null
  currency: string | null
  status: string | null
  payment_method: string | null
  provider_transaction_id: string | null
  client_phone: string | null
  failure_code: string | null
  failure_message: string | null
  completed_at: string | null
  created_at: string | null
}

const FAILED_STATUSES = new Set(['failed', 'rejected', 'canceled', 'in_reconciliation'])

export type PayoutRow = {
  id: string
  payout_id: string | null
  amount: number | null
  currency: string | null
  status: string | null
  provider: string | null
  phone_number: string | null
  country: string | null
  provider_transaction_id: string | null
  completed_at: string | null
  created_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  processing: 'bg-blue-100 text-blue-700 ring-blue-200',
  enqueued: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  pending: 'bg-amber-100 text-amber-700 ring-amber-200',
  failed: 'bg-red-100 text-red-700 ring-red-200',
  rejected: 'bg-red-100 text-red-700 ring-red-200',
  refunded: 'bg-slate-100 text-slate-700 ring-slate-200',
  in_reconciliation: 'bg-purple-100 text-purple-700 ring-purple-200',
}

function StatusBadge({ status }: { status: string | null }) {
  const cls = STATUS_STYLES[status || ''] || 'bg-slate-100 text-slate-700 ring-slate-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${cls}`}>
      {status || '—'}
    </span>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function fmtAmount(value: number | null | undefined, currency: string | null) {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'XOF',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${Math.round(value).toLocaleString('fr-FR')} ${currency || ''}`
  }
}

export function PaymentsTable({
  payments,
  payouts,
  page,
  pageSize,
  hasMore,
  month,
}: {
  payments: PaymentRow[]
  payouts: PayoutRow[]
  page: number
  pageSize: number
  hasMore: boolean
  month?: string
}) {
  const monthQs = month ? `&month=${encodeURIComponent(month)}` : ''
  const [tab, setTab] = useState<'payments' | 'payouts'>('payments')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payments.filter((p) => {
      if (status && p.status !== status) return false
      if (!q) return true
      return (
        (p.ref_command || '').toLowerCase().includes(q) ||
        (p.user_email || '').toLowerCase().includes(q) ||
        (p.payment_method || '').toLowerCase().includes(q) ||
        (p.provider_transaction_id || '').toLowerCase().includes(q)
      )
    })
  }, [payments, search, status])

  const filteredPayouts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payouts.filter((p) => {
      if (status && p.status !== status) return false
      if (!q) return true
      return (
        (p.payout_id || '').toLowerCase().includes(q) ||
        (p.provider || '').toLowerCase().includes(q) ||
        (p.phone_number || '').toLowerCase().includes(q) ||
        (p.provider_transaction_id || '').toLowerCase().includes(q)
      )
    })
  }, [payouts, search, status])

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setTab('payments')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === 'payments' ? 'bg-white dark:bg-slate-700 text-foreground dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Paiements ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('payouts')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === 'payouts' ? 'bg-white dark:bg-slate-700 text-foreground dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Payouts ({payouts.length})
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche..."
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
          <select
            aria-label="Filtrer par statut"
            title="Filtrer par statut"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-foreground dark:text-slate-100"
          >
            <option value="">Tous statuts</option>
            <option value="completed">Complété</option>
            <option value="processing">En cours</option>
            <option value="enqueued">En file</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoué</option>
            <option value="rejected">Rejeté</option>
            <option value="refunded">Remboursé</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        {tab === 'payments' ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Téléphone</th>
                <th className="text-right px-4 py-2 font-medium">Montant</th>
                <th className="text-left px-4 py-2 font-medium">Méthode</th>
                <th className="text-left px-4 py-2 font-medium">Référence</th>
                <th className="text-left px-4 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    Aucun paiement
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-900/40/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {fmtDate(p.completed_at || p.created_at)}
                    </td>
                    <td className="px-4 py-2 text-foreground dark:text-slate-100">{p.user_email || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{p.client_phone || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground dark:text-slate-100 whitespace-nowrap">
                      {fmtAmount(p.final_amount ?? p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{p.payment_method || '—'}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-500 font-mono text-xs">
                      <span title={p.ref_command || ''}>
                        {p.ref_command ? p.ref_command.slice(0, 12) + '…' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={p.status} />
                        {FAILED_STATUSES.has(p.status || '') && (p.failure_code || p.failure_message) && (
                          <span
                            className="text-[11px] text-red-700 dark:text-red-400 max-w-[220px] truncate"
                            title={
                              p.failure_message
                                ? `${p.failure_code ? `[${p.failure_code}] ` : ''}${p.failure_message}`
                                : p.failure_code || ''
                            }
                          >
                            {p.failure_code ? <span className="font-mono">{p.failure_code}</span> : null}
                            {p.failure_code && p.failure_message ? ' · ' : ''}
                            {p.failure_message || ''}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Téléphone</th>
                <th className="text-right px-4 py-2 font-medium">Montant</th>
                <th className="text-left px-4 py-2 font-medium">Provider</th>
                <th className="text-left px-4 py-2 font-medium">Payout ID</th>
                <th className="text-left px-4 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    Aucun payout
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-900/40/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {fmtDate(p.completed_at || p.created_at)}
                    </td>
                    <td className="px-4 py-2 text-foreground dark:text-slate-100">{p.phone_number || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground dark:text-slate-100 whitespace-nowrap">
                      {fmtAmount(p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{p.provider || '—'}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-500 font-mono text-xs">
                      <span title={p.payout_id || ''}>
                        {p.payout_id ? p.payout_id.slice(0, 12) + '…' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {tab === 'payments' && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {page} · {pageSize} par page
          </p>
          <div className="flex gap-2">
            <a
              href={`?page=${Math.max(1, page - 1)}${monthQs}`}
              aria-disabled={page <= 1 ? 'true' : 'false'}
              className={`px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 ${
                page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              ← Précédent
            </a>
            <a
              href={`?page=${page + 1}${monthQs}`}
              aria-disabled={!hasMore ? 'true' : 'false'}
              className={`px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 ${
                !hasMore ? 'pointer-events-none opacity-40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Suivant →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
