export const dynamic = "force-dynamic"

import { getUsers, getFavoritesCounts } from "@/app/actions/user"
import { UsersTable } from "./users-table"
import { BulkAddUsersDialog } from "./bulk-add-dialog"
import { CampaignActivateDialog } from "./campaign-activate-dialog"

export default async function UsersPage() {
  // Les historiques (paiements, activité) sont chargés à la demande depuis la
  // fiche utilisateur via popup — plus de chargement global des paiements ici.
  const [usersResult, favoritesResult] = await Promise.all([
    getUsers(),
    getFavoritesCounts(),
  ])

  if (!usersResult.success || !usersResult.data) {
    return <div>Failed to load users</div>
  }

  const users = usersResult.data
  const favoritesCounts = favoritesResult.data || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez l&apos;accès des utilisateurs. Cliquez sur une ligne pour voir les détails de paiement.
          </p>
        </div>
        <div className="flex gap-2">
            <CampaignActivateDialog />
            <BulkAddUsersDialog />
          </div>
      </div>

      <UsersTable
        users={users as Array<Record<string, unknown>>}
        favoritesCounts={favoritesCounts as Record<string, number>}
      />
    </div>
  )
}
