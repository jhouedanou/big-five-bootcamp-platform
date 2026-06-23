import { RequireCompletedProfile } from "@/components/onboarding/RequireCompletedProfile"

/**
 * Le middleware garantit déjà (côté serveur) qu'un utilisateur au profil
 * incomplet est redirigé vers /onboarding. RequireCompletedProfile ajoute un
 * filet de sécurité côté client (modal bloquante) pour les navigations SPA.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCompletedProfile>{children}</RequireCompletedProfile>
}
