export const dynamic = "force-dynamic"

import { getUsers, getPayments, getFavoritesCounts } from "@/app/actions/user"
import { UsersTable } from "./users-table"

export default async function UsersPage() {
  const [usersResult, paymentsResult, favoritesResult] = await Promise.all([
    getUsers(),
    getPayments(),
    getFavoritesCounts(),
  ])

  if (!usersResult.success || !usersResult.data) {
    return <div>Failed to load users</div>
  }

  const users = usersResult.data
  const payments = paymentsResult.data || []
  const favoritesCounts = favoritesResult.data || {}

  // Group payments by user email
  const paymentsByEmail: Record<string, typeof payments> = {}
  for (const payment of payments) {
    const email = payment.user_email
    if (!email) continue
    if (!paymentsByEmail[email]) paymentsByEmail[email] = []
    paymentsByEmail[email].push(payment)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Utilisateurs</h1>
        <p className="text-muted-foreground">
          Gérez l'accès des utilisateurs. Cliquez sur une ligne pour voir les détails de paiement.
        </p>
      </div>

      <UsersTable
        users={users as Array<Record<string, unknown>>}
        paymentsByEmail={paymentsByEmail}
        favoritesCounts={favoritesCounts as Record<string, number>}
      />
    </div>
  )
}
