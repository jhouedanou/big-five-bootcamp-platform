import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const levelBadgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      level: {
        debutant: "bg-green-100 text-green-700",
        intermediaire: "bg-[#F2B33D]/20 text-[#CE9D4D]",
        avance: "bg-[#80368D]/10 text-[#80368D]",
      },
    },
    defaultVariants: {
      level: "intermediaire",
    },
  }
)

const formatBadgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      format: {
        presentiel: "bg-[#29358B]/10 text-[#29358B]",
        hybride: "bg-[#0A74C0]/10 text-[#0A74C0]",
        online: "bg-[#4E34AD]/10 text-[#4E34AD]",
      },
    },
    defaultVariants: {
      format: "presentiel",
    },
  }
)

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      status: {
        open: "bg-green-100 text-green-700",
        full: "bg-red-100 text-red-700",
        "coming-soon": "bg-[#D0E4F2] text-[#29358B]",
      },
    },
    defaultVariants: {
      status: "open",
    },
  }
)

export interface LevelBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof levelBadgeVariants> {}

export function LevelBadge({ className, level, ...props }: LevelBadgeProps) {
  const levelLabels = {
    debutant: "Débutant",
    intermediaire: "Intermédiaire",
    avance: "Avancé",
  }
  
  return (
    <span className={cn(levelBadgeVariants({ level }), className)} {...props}>
      {level && levelLabels[level]}
    </span>
  )
}

export interface FormatBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof formatBadgeVariants> {}

export function FormatBadge({ className, format, ...props }: FormatBadgeProps) {
  const formatLabels = {
    presentiel: "Présentiel",
    hybride: "Hybride",
    online: "En ligne",
  }
  
  return (
    <span className={cn(formatBadgeVariants({ format }), className)} {...props}>
      {format && formatLabels[format]}
    </span>
  )
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  const statusLabels = {
    open: "Places disponibles",
    full: "Complet",
    "coming-soon": "Bientôt",
  }
  
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {status && statusLabels[status]}
    </span>
  )
}

export function DurationBadge({ duration, className }: { duration: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-[#D0E4F2] px-3 py-1 text-xs font-medium text-[#29358B]", className)}>
      {duration}
    </span>
  )
}

export function PriceBadge({ price, currency = "FCFA", className }: { price: number; currency?: string; className?: string }) {
  const formattedPrice = new Intl.NumberFormat('fr-FR').format(price)
  
  return (
    <span className={cn("inline-flex items-center font-bold text-[#80368D]", className)}>
      {formattedPrice} {currency}
    </span>
  )
}
