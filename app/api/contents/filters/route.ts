import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

// GET - Récupérer les options de filtres disponibles depuis les campagnes
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Récupérer toutes les campagnes publiées pour en extraire les filtres
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('brand, category, platforms, tags')
      .eq('status', 'Publié')

    if (error) throw error

    // Extraire les valeurs uniques
    const brands = new Set<string>()
    const categories = new Set<string>()
    const platforms = new Set<string>()
    const tags = new Set<string>()

    for (const c of campaigns || []) {
      if (c.brand) brands.add(c.brand)
      if (c.category) categories.add(c.category)
      if (Array.isArray(c.platforms)) c.platforms.forEach((p: string) => platforms.add(p))
      if (Array.isArray(c.tags)) c.tags.forEach((t: string) => tags.add(t))
    }

    return NextResponse.json({
      filters: {
        brands: Array.from(brands).sort(),
        categories: Array.from(categories).sort(),
        platforms: Array.from(platforms).sort(),
        tags: Array.from(tags).sort(),
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
