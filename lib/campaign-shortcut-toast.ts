import { toast } from "sonner"

/**
 * Toast de succès affiché après l'ajout d'une campagne aux favoris ou à une
 * collection, avec un raccourci direct vers le générateur de campagnes.
 */
export function toastCampaignShortcut(message: string) {
  toast.success(message, {
    action: {
      label: "Générer une campagne",
      onClick: () => {
        window.location.href = "/campaign-generator"
      },
    },
  })
}
