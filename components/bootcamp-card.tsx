import Link from "next/link"
import { ArrowRight, Clock, Users, Share2, Search, PenTool, Target, BarChart3 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { LevelBadge, FormatBadge, DurationBadge, PriceBadge } from "@/components/ui/bootcamp-badges"
import { Bootcamp, formatPrice } from "@/lib/bootcamps-data"
import { cn } from "@/lib/utils"

const iconMap: Record<string, React.ElementType> = {
  "share-2": Share2,
  "search": Search,
  "pen-tool": PenTool,
  "target": Target,
  "bar-chart-3": BarChart3,
}

interface BootcampCardProps {
  bootcamp: Bootcamp
  variant?: "default" | "featured" | "compact"
  className?: string
}

export function BootcampCard({ bootcamp, variant = "default", className }: BootcampCardProps) {
  const Icon = iconMap[bootcamp.icon] || Share2

  if (variant === "compact") {
    return (
      <Link href={`/bootcamps/${bootcamp.slug}`} className="block group">
        <Card className={cn(
          "overflow-hidden border-[#D0E4F2] transition-all duration-300 hover:border-[#80368D]/30 hover:shadow-lg hover:shadow-[#80368D]/10 hover:-translate-y-1",
          className
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#80368D]/10 to-[#29358B]/10 text-[#80368D] transition-colors group-hover:from-[#80368D]/20 group-hover:to-[#29358B]/20">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#1A1F2B] truncate group-hover:text-[#80368D] transition-colors">
                  {bootcamp.title}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-sm text-[#1A1F2B]/60">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{bootcamp.duration}</span>
                </div>
              </div>
              <PriceBadge price={bootcamp.price} className="text-sm" />
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  if (variant === "featured") {
    return (
      <Link href={`/bootcamps/${bootcamp.slug}`} className="block group">
        <Card className={cn(
          "relative overflow-hidden border-[#D0E4F2] transition-all duration-300 hover:border-[#80368D]/30 hover:shadow-xl hover:shadow-[#80368D]/10 hover:-translate-y-2",
          className
        )}>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#80368D]/5 to-[#29358B]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <CardContent className="relative p-6">
            {/* Icon and badges */}
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#80368D] to-[#29358B] text-white shadow-lg shadow-[#80368D]/25">
                <Icon className="h-7 w-7" />
              </div>
              <div className="flex gap-2">
                <LevelBadge level={bootcamp.level} />
                <FormatBadge format={bootcamp.format} />
              </div>
            </div>

            {/* Title and tagline */}
            <div className="mt-5">
              <h3 className="text-xl font-bold text-[#1A1F2B] group-hover:text-[#80368D] transition-colors">
                {bootcamp.title}
              </h3>
              <p className="mt-1 text-sm text-[#80368D] font-medium">
                {bootcamp.tagline}
              </p>
            </div>

            {/* Description */}
            <p className="mt-3 text-sm text-[#1A1F2B]/60 line-clamp-2">
              {bootcamp.shortDescription}
            </p>

            {/* Meta info */}
            <div className="mt-4 flex items-center gap-4 text-sm text-[#1A1F2B]/60">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#29358B]" />
                <span>{bootcamp.duration}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#29358B]" />
                <span>{bootcamp.targetAudience.length} profils</span>
              </div>
            </div>

            {/* Price and CTA */}
            <div className="mt-5 flex items-center justify-between pt-4 border-t border-[#D0E4F2]">
              <div>
                <p className="text-xs text-[#1A1F2B]/50 uppercase tracking-wider">À partir de</p>
                <p className="text-xl font-bold text-[#80368D]">
                  {formatPrice(bootcamp.price)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#29358B] group-hover:text-[#80368D] transition-colors">
                Voir le programme
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Default variant
  return (
    <Link href={`/bootcamps/${bootcamp.slug}`} className="block group">
      <Card className={cn(
        "overflow-hidden border-[#D0E4F2] transition-all duration-300 hover:border-[#80368D]/30 hover:shadow-lg hover:shadow-[#80368D]/10 hover:-translate-y-1",
        className
      )}>
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#80368D]/10 to-[#29358B]/10 text-[#80368D] transition-all group-hover:from-[#80368D] group-hover:to-[#29358B] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[#80368D]/25">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1A1F2B] group-hover:text-[#80368D] transition-colors">
                {bootcamp.title}
              </h3>
              <p className="mt-0.5 text-sm text-[#80368D]">{bootcamp.tagline}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            <DurationBadge duration={bootcamp.duration} />
            <LevelBadge level={bootcamp.level} />
            <FormatBadge format={bootcamp.format} />
          </div>

          {/* Description */}
          <p className="mt-3 text-sm text-[#1A1F2B]/60 line-clamp-2">
            {bootcamp.shortDescription}
          </p>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#D0E4F2]">
            <PriceBadge price={bootcamp.price} className="text-lg" />
            <span className="flex items-center gap-1 text-sm font-medium text-[#29358B] group-hover:text-[#80368D] transition-colors">
              En savoir plus
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
