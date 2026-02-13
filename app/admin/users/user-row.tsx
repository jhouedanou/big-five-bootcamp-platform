"use client"

import { useState } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { UserStatusToggle } from "./user-status-toggle"
import { ChevronDown, ChevronRight, CreditCard, Calendar, Clock, Heart } from "lucide-react"

interface Payment {
    id: string
    ref_command: string
    amount: number
    currency: string
    payment_method: string | null
    status: string
    user_email: string
    item_name: string | null
    created_at: string
    completed_at: string | null
}

interface UserRowProps {
    user: Record<string, unknown>
    payments: Payment[]
    favoritesCount: number
}

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function getSubscriptionDaysLeft(endDate: string | null | undefined): number | null {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
}

function getPaymentStatusBadge(status: string) {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-800'
        case 'pending':
            return 'bg-yellow-100 text-yellow-800'
        case 'failed':
            return 'bg-red-100 text-red-800'
        case 'canceled':
            return 'bg-slate-100 text-slate-600'
        case 'refunded':
            return 'bg-blue-100 text-blue-800'
        default:
            return 'bg-slate-100 text-slate-600'
    }
}

function getPaymentStatusLabel(status: string) {
    switch (status) {
        case 'completed': return 'Payé'
        case 'pending': return 'En attente'
        case 'failed': return 'Échoué'
        case 'canceled': return 'Annulé'
        case 'refunded': return 'Remboursé'
        default: return status
    }
}

export function UserRow({ user, payments, favoritesCount }: UserRowProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const subStart = user.subscription_start_date as string | null | undefined
    const subEnd = user.subscription_end_date as string | null | undefined
    const daysLeft = getSubscriptionDaysLeft(subEnd)
    const hasSubscription = !!subStart

    return (
        <>
            <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <TableCell className="w-8">
                    {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    }
                </TableCell>
                <TableCell className="font-medium">{(user.name as string) || "N/A"}</TableCell>
                <TableCell>{user.email as string}</TableCell>
                <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-800'
                    }`}>
                        {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                    </span>
                </TableCell>
                <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.plan === 'Premium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                    }`}>
                        {(user.plan as string) || 'Free'}
                    </span>
                </TableCell>
                <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}>
                        {user.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                </TableCell>
                <TableCell>
                    {hasSubscription ? (
                        <div className="text-xs">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span>{formatDate(subStart)} → {formatDate(subEnd)}</span>
                            </div>
                            {daysLeft !== null && (
                                <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                    daysLeft > 7
                                        ? 'bg-green-50 text-green-700'
                                        : daysLeft > 0
                                            ? 'bg-amber-50 text-amber-700'
                                            : 'bg-red-50 text-red-700'
                                }`}>
                                    <Clock className="h-3 w-3" />
                                    {daysLeft > 0 ? `${daysLeft}j restants` : 'Expiré'}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">Aucun</span>
                    )}
                </TableCell>
                <TableCell>
                    {favoritesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                            {favoritesCount}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                    )}
                </TableCell>
                <TableCell>
                    {formatDate(user.created_at as string)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <UserStatusToggle id={user.id as string} status={(user.status as string) || 'active'} />
                </TableCell>
            </TableRow>

            {/* Expanded section: payment history */}
            {isExpanded && (
                <TableRow>
                    <TableCell colSpan={10} className="bg-muted/30 p-0">
                        <div className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold text-sm">
                                    Historique des paiements
                                    {payments.length > 0 && (
                                        <span className="ml-2 text-muted-foreground font-normal">
                                            ({payments.length} transaction{payments.length > 1 ? 's' : ''})
                                        </span>
                                    )}
                                </h4>
                            </div>

                            {payments.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">
                                    Aucun paiement enregistré pour cet utilisateur.
                                </p>
                            ) : (
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/50 text-left">
                                                <th className="px-3 py-2 font-medium text-muted-foreground">Référence</th>
                                                <th className="px-3 py-2 font-medium text-muted-foreground">Description</th>
                                                <th className="px-3 py-2 font-medium text-muted-foreground">Montant</th>
                                                <th className="px-3 py-2 font-medium text-muted-foreground">Méthode</th>
                                                <th className="px-3 py-2 font-medium text-muted-foreground">Statut</th>
                                                <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((payment) => (
                                                <tr key={payment.id} className="border-t">
                                                    <td className="px-3 py-2 font-mono text-xs">
                                                        {payment.ref_command?.substring(0, 20) || '—'}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {payment.item_name || 'Abonnement'}
                                                    </td>
                                                    <td className="px-3 py-2 font-semibold">
                                                        {payment.amount?.toLocaleString('fr-FR')} {payment.currency || 'XOF'}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {payment.payment_method || '—'}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(payment.status)}`}>
                                                            {getPaymentStatusLabel(payment.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground">
                                                        {formatDateTime(payment.created_at)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {payments.filter(p => p.status === 'completed').length > 0 && (
                                            <tfoot>
                                                <tr className="border-t bg-muted/30">
                                                    <td colSpan={2} className="px-3 py-2 font-medium text-right">Total payé :</td>
                                                    <td className="px-3 py-2 font-bold text-green-700" colSpan={4}>
                                                        {payments
                                                            .filter(p => p.status === 'completed')
                                                            .reduce((sum, p) => sum + (p.amount || 0), 0)
                                                            .toLocaleString('fr-FR')
                                                        } XOF
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    )
}
