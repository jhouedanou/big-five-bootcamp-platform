import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"

// GET - Récupérer les options de filtres disponibles
export async function GET() {
  try {
    // Récupérer les valeurs uniques pour chaque filtre
    const [
      countries,
      sectors,
      platforms,
      formats,
      medias,
      years,
      awards,
      brands,
      agencies,
      tags
    ] = await Promise.all([
      prisma.content.findMany({
        where: { status: "published" },
        select: { country: true },
        distinct: ["country"],
        orderBy: { country: "asc" }
      }),
      prisma.content.findMany({
        where: { status: "published" },
        select: { sector: true },
        distinct: ["sector"],
        orderBy: { sector: "asc" }
      }),
      prisma.content.findMany({
        where: { status: "published" },
        select: { platform: true },
        distinct: ["platform"],
        orderBy: { platform: "asc" }
      }),
      prisma.content.findMany({
        where: { status: "published" },
        select: { format: true },
        distinct: ["format"],
        orderBy: { format: "asc" }
      }),
      prisma.content.findMany({
        where: { status: "published", media: { not: null } },
        select: { media: true },
        distinct: ["media"],
        orderBy: { media: "asc" }
      }),
      prisma.content.findMany({
        where: { status: "published", year: { not: null } },
        select: { year: true },
        distinct: ["year"],
        orderBy: { year: "desc" }
      }),
      prisma.content.findMany({
        where: { status: "published", award: { not: null } },
        select: { award: true },
        distinct: ["award"],
        orderBy: { award: "asc" }
      }),
      prisma.content.findMany({
        where: { status: "published", brand: { not: null } },
        select: { brand: true },
        distinct: ["brand"],
        orderBy: { brand: "asc" }
      }),
      prisma.content.findMany({
        where: { status: "published", agency: { not: null } },
        select: { agency: true },
        distinct: ["agency"],
        orderBy: { agency: "asc" }
      }),
      prisma.tag.findMany({
        orderBy: { name: "asc" }
      })
    ])

    return NextResponse.json({
      filters: {
        countries: countries.map(c => c.country).filter(Boolean),
        sectors: sectors.map(s => s.sector).filter(Boolean),
        platforms: platforms.map(p => p.platform).filter(Boolean),
        formats: formats.map(f => f.format).filter(Boolean),
        medias: medias.map(m => m.media).filter(Boolean),
        years: years.map(y => y.year).filter(Boolean),
        awards: awards.map(a => a.award).filter(Boolean),
        brands: brands.map(b => b.brand).filter(Boolean),
        agencies: agencies.map(a => a.agency).filter(Boolean),
        tags: tags.map(t => ({ id: t.id, name: t.name, color: t.color }))
      }
    })

  } catch (error) {
    console.error("Filters GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
