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
  brand?: string
  agency?: string
  year?: number
  award?: string
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
  "Telecoms": "bg-blue-600 text-white shadow-md shadow-blue-600/20",
  "Banque/Finance": "bg-purple-600 text-white shadow-md shadow-purple-600/20",
  "FMCG": "bg-orange-500 text-white shadow-md shadow-orange-500/20",
  "E-commerce": "bg-pink-600 text-white shadow-md shadow-pink-600/20",
  "Tech": "bg-cyan-600 text-white shadow-md shadow-cyan-600/20",
  "Mode": "bg-rose-600 text-white shadow-md shadow-rose-600/20",
  "Energie": "bg-yellow-500 text-white shadow-md shadow-yellow-500/20",
  "Industrie": "bg-slate-600 text-white shadow-md shadow-slate-600/20",
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
      <article className="modern-card overflow-hidden hover-lift">
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
            <span className="mb-4 rounded-full bg-[#80368D] px-4 py-1.5 text-xs font-medium text-white shadow-lg">
              Voir details
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="line-clamp-2 font-[family-name:var(--font-heading)] text-sm font-semibold text-[#1A1F2B] transition-colors group-hover:text-[#80368D]">
            {content.title}
          </h3>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sectorColor}`}>
              {content.sector}
            </span>
            {content.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#D0E4F2]/50 px-2 py-0.5 text-xs text-[#1A1F2B]/70"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[#1A1F2B]/60">
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
