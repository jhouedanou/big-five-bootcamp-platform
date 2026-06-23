import { toast } from "sonner"

/**
 * Toast de succès affiché après l'ajout d'une campagne aux favoris ou à une
 * collection.
 *
 * Le raccourci vers le générateur de campagnes est retiré : fonctionnalité non
 * validée par le client. Restaurer l'action `Générer une campagne` une fois la
 * fonctionnalité validée (voir SHOW_CAMPAIGN_GENERATOR dans dashboard-navbar).
 */
export function toastCampaignShortcut(message: string) {
  toast.success(message)
}
