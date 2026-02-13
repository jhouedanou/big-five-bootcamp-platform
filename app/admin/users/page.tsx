import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { getUsers, getPayments } from "@/app/actions/user"
import { UserRow } from "./user-row"

export default async function UsersPage() {
  const [usersResult, paymentsResult] = await Promise.all([
    getUsers(),
    getPayments(),
  ])

  if (!usersResult.success || !usersResult.data) {
    return <div>Failed to load users</div>
  }

  const users = usersResult.data
  const payments = paymentsResult.data || []

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

      <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Accès</TableHead>
              <TableHead>Abonnement</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: Record<string, unknown>) => (
                <UserRow
                  key={user.id as string}
                  user={user}
                  payments={paymentsByEmail[(user.email as string)] || []}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
