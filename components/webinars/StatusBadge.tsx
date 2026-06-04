import { cn } from "@/lib/utils"
import type { PublicStatus } from "@/lib/webinars"

const STYLES: Record<PublicStatus, string> = {
  "inscriptions ouvertes": "bg-green-100 text-green-700 border-green-200",
  "à venir": "bg-blue-100 text-blue-700 border-blue-200",
  complet: "bg-orange-100 text-orange-700 border-orange-200",
  terminé: "bg-neutral-100 text-neutral-500 border-neutral-200",
  annulé: "bg-red-100 text-red-700 border-red-200",
}

export function StatusBadge({ status, className }: { status: PublicStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        STYLES[status],
        className
      )}
    >
      {status}
    </span>
  )
}
