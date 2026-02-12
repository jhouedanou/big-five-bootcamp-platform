'use client'

import { CreativeCard } from "@/components/library/creative-card-with-favorites"

interface Creative {
    id: string
    title: string
    thumbnail: string
    platform: string
    format: string
    sector: string
    objective: string
    videoUrl?: string | null
    whyItWorks?: string | null
    howToUse?: string | null
}

interface LibraryGridProps {
    creatives: Creative[]
}

export function LibraryGrid({ creatives }: LibraryGridProps) {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {creatives.map((creative) => (
                <CreativeCard key={creative.id} creative={creative} />
            ))}
        </div>
    )
}
