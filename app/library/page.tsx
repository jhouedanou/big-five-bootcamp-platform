import { createClient } from "@supabase/supabase-js"
import { CreativeCard } from "@/components/library/creative-card"
import { FilterBar } from "@/components/library/filter-bar"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Bibliothèque Créative - Big Five",
    description: "Explorez notre collection de publicités performantes pour vous inspirer.",
}

interface LibraryPageProps {
    searchParams: {
        search?: string
        platform?: string
        format?: string
        sector?: string
        objective?: string
    }
}

async function getCreatives(params: LibraryPageProps["searchParams"]) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
        let query = supabase
            .from('campaigns')
            .select('*')
            .eq('status', 'Publié')
            .order('created_at', { ascending: false })

        if (params.search) {
            query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,brand.ilike.%${params.search}%,category.ilike.%${params.search}%`)
        }
        if (params.platform) query = query.contains('platforms', [params.platform])
        if (params.sector) query = query.eq('category', params.sector)

        const { data, error } = await query
        if (error) throw error

        // Adapter le format pour le composant CreativeCard
        return (data || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            thumbnail: c.thumbnail || '',
            videoUrl: c.video_url || null,
            platform: c.platforms?.[0] || 'Facebook',
            format: c.video_url ? 'Vidéo' : 'Image',
            sector: c.category || 'Marketing',
            objective: '',
            whyItWorks: c.description || null,
            howToUse: null,
            status: 'published',
            createdAt: c.created_at,
            updatedAt: c.updated_at,
        }))
    } catch (error) {
        console.error("Error fetching creatives:", error)
        return []
    }
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
    const creatives = await getCreatives(searchParams)

    return (
        <div className="container mx-auto min-h-screen px-4 pb-12 pt-6">
            <div className="mb-8 space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    Bibliothèque Créative
                </h1>
                <p className="max-w-2xl text-lg text-muted-foreground">
                    Découvrez des centaines de publicités performantes, analysées et décryptées pour booster vos propres campagnes.
                </p>
            </div>

            <FilterBar />

            <div className="mt-8">
                {creatives.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {creatives.map((creative) => (
                            <CreativeCard key={creative.id} creative={creative} />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center animate-in fade-in-50">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <span className="text-2xl">🔍</span>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">Aucun résultat trouvé</h3>
                        <p className="mt-2 text-muted-foreground">
                            Essayez de modifier vos filtres ou votre recherche pour trouver ce que vous cherchez.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
