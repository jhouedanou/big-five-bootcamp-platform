import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"
import { z } from "zod"

// Schéma de validation
const contentCreateSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  brand: z.string().optional(),
  advertiser: z.string().optional(),
  agency: z.string().optional(),
  productionCompany: z.string().optional(),
  country: z.string(),
  sector: z.string(),
  platform: z.string(),
  format: z.string(),
  media: z.string().optional(),
  year: z.number().int().min(1990).max(2030).optional(),
  award: z.string().optional(),
  contributors: z.string().optional(),
  keywords: z.string().optional(),
  status: z.enum(["draft", "pending", "published"]).optional(),
  featured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

// GET - Liste des contenus avec filtres avancés
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")
    
    // Filtres multiples
    const search = searchParams.get("search") || ""
    const brand = searchParams.get("brand")
    const advertiser = searchParams.get("advertiser")
    const agency = searchParams.get("agency")
    const productionCompany = searchParams.get("productionCompany")
    const country = searchParams.get("country")
    const countries = searchParams.get("countries")?.split(",").filter(Boolean)
    const sector = searchParams.get("sector")
    const sectors = searchParams.get("sectors")?.split(",").filter(Boolean)
    const platform = searchParams.get("platform")
    const platforms = searchParams.get("platforms")?.split(",").filter(Boolean)
    const format = searchParams.get("format")
    const formats = searchParams.get("formats")?.split(",").filter(Boolean)
    const media = searchParams.get("media")
    const year = searchParams.get("year")
    const award = searchParams.get("award")
    const tags = searchParams.get("tags")?.split(",").filter(Boolean)
    const keywords = searchParams.get("keywords")
    const featured = searchParams.get("featured")
    const status = searchParams.get("status")

    const where: any = {}

    // Recherche textuelle
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } },
        { advertiser: { contains: search } },
        { agency: { contains: search } },
        { keywords: { contains: search } },
      ]
    }

    // Filtres simples
    if (brand) where.brand = { contains: brand }
    if (advertiser) where.advertiser = { contains: advertiser }
    if (agency) where.agency = { contains: agency }
    if (productionCompany) where.productionCompany = { contains: productionCompany }
    if (keywords) where.keywords = { contains: keywords }
    if (media) where.media = media
    if (award) where.award = { contains: award }
    if (year) where.year = parseInt(year)
    if (featured === "true") where.featured = true

    // Filtres multiples (OR dans la même catégorie)
    if (country) where.country = country
    if (countries?.length) where.country = { in: countries }
    
    if (sector) where.sector = sector
    if (sectors?.length) where.sector = { in: sectors }
    
    if (platform) where.platform = platform
    if (platforms?.length) where.platform = { in: platforms }
    
    if (format) where.format = format
    if (formats?.length) where.format = { in: formats }

    // Statut (par défaut, seuls les publiés pour les non-admins)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      where.status = "published"
    } else if (status) {
      where.status = status
    }

    // Tags
    if (tags?.length) {
      where.tags = {
        some: {
          tag: {
            name: { in: tags }
          }
        }
      }
    }

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              favorites: true,
              views: true,
            }
          }
        },
        orderBy: [
          { featured: "desc" },
          { publishedAt: "desc" },
          { createdAt: "desc" }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.content.count({ where })
    ])

    // Formater la réponse
    const formattedContents = contents.map(content => ({
      ...content,
      tags: content.tags.map(ct => ct.tag),
      favoritesCount: content._count.favorites,
      viewsCount: content._count.views,
    }))

    return NextResponse.json({
      contents: formattedContents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error("Contents GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST - Créer un contenu (admin/modérateur)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !["admin", "moderator"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = contentCreateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { tags, ...data } = validation.data

    const content = await prisma.content.create({
      data: {
        ...data,
        status: data.status || "draft",
        publishedAt: data.status === "published" ? new Date() : null,
        tags: tags?.length ? {
          create: await Promise.all(tags.map(async (tagName) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { 
                name: tagName,
                slug: tagName.toLowerCase().replace(/\s+/g, "-")
              }
            })
            return { tagId: tag.id }
          }))
        } : undefined
      },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    })

    return NextResponse.json({ content }, { status: 201 })

  } catch (error) {
    console.error("Contents POST error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
