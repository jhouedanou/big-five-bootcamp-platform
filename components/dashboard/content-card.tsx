"use client"

import React from "react"

import Link from "next/link"
import { Play, Calendar, Globe, Facebook, Instagram, Linkedin, Youtube } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export interface ContentItem {
  id: string
  title: string
  description: string
  imageUrl: string
  platform: string
  country: string
  sector: string
  format: string
  tags: string[]
  date: string
  isVideo?: boolean
}

interface ContentCardProps {
  content: ContentItem
}

const platformConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
  "Facebook": { bg: "bg-[#1877F2]", icon: <Facebook className="h-3 w-3 text-white" /> },
  "Instagram": { bg: "bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737]", icon: <Instagram className="h-3 w-3 text-white" /> },
  "LinkedIn": { bg: "bg-[#0A66C2]", icon: <Linkedin className="h-3 w-3 text-white" /> },
  "TikTok": { bg: "bg-black", icon: <span className="text-[10px] font-bold text-white">TT</span> },
  "Twitter/X": { bg: "bg-black", icon: <span className="text-[10px] font-bold text-white">X</span> },
  "YouTube": { bg: "bg-[#FF0000]", icon: <Youtube className="h-3 w-3 text-white" /> },
  "Outdoor": { bg: "bg-[#0A1F44]", icon: <span className="text-[10px] font-bold text-white">OOH</span> },
}

const sectorColors: Record<string, string> = {
  "Telecoms": "bg-blue-500/10 text-blue-600",
  "Banque/Finance": "bg-emerald-500/10 text-emerald-600",
  "FMCG": "bg-orange-500/10 text-orange-600",
  "E-commerce": "bg-purple-500/10 text-purple-600",
  "Tech": "bg-cyan-500/10 text-cyan-600",
  "Mode": "bg-pink-500/10 text-pink-600",
  "Energie": "bg-yellow-500/10 text-yellow-700",
  "Industrie": "bg-gray-500/10 text-gray-600",
}

const countryFlags: Record<string, string> = {
  "Cote d'Ivoire": "CI",
  "Senegal": "SN",
  "Nigeria": "NG",
  "Afrique du Sud": "ZA",
  "Ghana": "GH",
  "Kenya": "KE",
  "Maroc": "MA",
  "France": "FR",
  "USA": "US",
}

export function ContentCard({ content }: ContentCardProps) {
  const platform = platformConfig[content.platform] || { bg: "bg-gray-500", icon: <span className="text-[10px] font-bold text-white">?</span> }
  const sectorColor = sectorColors[content.sector] || "bg-muted text-muted-foreground"

  return (
    <Link href={`/content/${content.id}`} className="group block">
      <article className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#0A1F44] to-[#1a3a6e]">
          {content.imageUrl ? (
            <img 
              src={content.imageUrl || "/placeholder.svg"} 
              alt={content.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-4xl font-bold text-white/20">
                {content.title.substring(0, 2).toUpperCase()}
              </div>
            </div>
          )}
          
          {/* Video play overlay */}
          {content.isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition-all group-hover:opacity-100">
                <Play className="h-6 w-6 text-[#0A1F44]" fill="currentColor" />
              </div>
            </div>
          )}
          
          {/* Platform badge */}
          <div className="absolute right-2 top-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${platform.bg} shadow-md`}>
              {platform.icon}
            </div>
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
            <span className="mb-4 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-lg">
              Voir details
            </span>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="line-clamp-2 font-[family-name:var(--font-heading)] text-sm font-semibold text-card-foreground transition-colors group-hover:text-primary">
            {content.title}
          </h3>
          
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sectorColor}`}>
              {content.sector}
            </span>
            {content.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              <span>{countryFlags[content.country] || content.country}</span>
              <span className="mx-1">·</span>
              <span>{content.country}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{content.date}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
