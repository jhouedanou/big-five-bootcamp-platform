import { RequireCompletedProfile } from "@/components/onboarding/RequireCompletedProfile"

/**
 * Le paiement ne doit pas court-circuiter l'onboarding (QA T01).
 * Le middleware redirige déjà côté serveur ; cette modal bloquante couvre
 * les navigations SPA vers la page de souscription.
 */
export default function SubscribeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCompletedProfile>{children}</RequireCompletedProfile>
}
