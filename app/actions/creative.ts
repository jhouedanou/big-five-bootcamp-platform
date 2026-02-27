"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { generateSlug, getGoogleDriveImageUrl } from "@/lib/utils"

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

export async function getCreatives() {
    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        return { success: false, error: "Failed to fetch creatives" }
    }
}

export async function getCreativeById(id: string) {
    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        return { success: false, error: "Failed to fetch creative" }
    }
}

export async function createCreative(formData: FormData) {
    const title = formData.get("title") as string
    const platform = formData.get("platform") as string
    const format = formData.get("format") as string
    const sector = formData.get("sector") as string
    const objective = formData.get("objective") as string
    const thumbnail = formData.get("thumbnail") as string
    const videoUrl = formData.get("videoUrl") as string
    const campaignDate = formData.get("campaignDate") as string
    const whyItWorks = formData.get("whyItWorks") as string
    const howToUse = formData.get("howToUse") as string
    const brand = formData.get("brand") as string
    const country = formData.get("country") as string
    const agency = formData.get("agency") as string
    const year = formData.get("year") as string

    try {
        const supabase = getSupabaseAdmin()
        
        // Générer le slug avec vérification d'unicité
        let slug = generateSlug(title)
        let slugCounter = 2
        while (true) {
            const { data: existing } = await supabase
                .from('campaigns')
                .select('id')
                .eq('slug', slug)
                .maybeSingle()
            if (!existing) break
            slug = `${generateSlug(title)}-${slugCounter}`
            slugCounter++
        }
        
        const { error } = await supabase.from('campaigns').insert({
            title,
            slug,
            category: sector,
            platforms: [platform],
            thumbnail,
            video_url: videoUrl || null,
            campaign_date: campaignDate || null,
            description: [whyItWorks, howToUse].filter(Boolean).join('\n\n') || null,
            tags: [format, objective].filter(Boolean),
            status: 'Publié',
            brand: brand || null,
            country: country || null,
            agency: agency || null,
            year: year ? parseInt(year) : null,
            format: format || null,
        })

        if (error) throw error
        revalidatePath("/admin/creatives")
        revalidatePath("/library")
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to create creative" }
    }
}

export async function updateCreative(id: string, formData: FormData) {
    const title = formData.get("title") as string
    const platform = formData.get("platform") as string
    const format = formData.get("format") as string
    const sector = formData.get("sector") as string
    const objective = formData.get("objective") as string
    const thumbnail = formData.get("thumbnail") as string
    const videoUrl = formData.get("videoUrl") as string
    const campaignDate = formData.get("campaignDate") as string
    const whyItWorks = formData.get("whyItWorks") as string
    const howToUse = formData.get("howToUse") as string
    const brand = formData.get("brand") as string
    const country = formData.get("country") as string
    const agency = formData.get("agency") as string
    const year = formData.get("year") as string

    try {
        const supabase = getSupabaseAdmin()
        const { error } = await supabase
            .from('campaigns')
            .update({
                title,
                category: sector,
                platforms: [platform],
                thumbnail,
                video_url: videoUrl || null,
                campaign_date: campaignDate || null,
                description: [whyItWorks, howToUse].filter(Boolean).join('\n\n') || null,
                tags: [format, objective].filter(Boolean),
                brand: brand || null,
                country: country || null,
                agency: agency || null,
                year: year ? parseInt(year) : null,
                format: format || null,
            })
            .eq('id', id)

        if (error) throw error
        revalidatePath("/admin/creatives")
        revalidatePath("/library")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update creative" }
    }
}

export async function deleteCreative(id: string) {
    try {
        const supabase = getSupabaseAdmin()
        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', id)

        if (error) throw error
        revalidatePath("/admin/creatives")
        revalidatePath("/library")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to delete creative" }
    }
}

interface CSVCreativeRow {
    title: string
    brand?: string
    agency?: string
    platform?: string
    country?: string
    sector?: string
    format?: string
    date?: string
    year?: string
    imageUrl?: string
    videoUrl?: string
    description?: string
    tags?: string
    status?: string
    accessLevel?: string
}

const VALID_STATUSES = ['Brouillon', 'En attente', 'Publié']
const VALID_ACCESS_LEVELS = ['free', 'premium']

export async function importCreativesFromCSV(rows: CSVCreativeRow[]) {
    const supabase = getSupabaseAdmin()
    const errors: string[] = []
    const skipped: string[] = []
    let imported = 0

    // Fetch existing campaigns for duplicate detection (title + brand)
    const { data: existingCampaigns } = await supabase
        .from('campaigns')
        .select('title, brand')

    const existingSet = new Set(
        (existingCampaigns || []).map(c =>
            `${(c.title || '').trim().toLowerCase()}||${(c.brand || '').trim().toLowerCase()}`
        )
    )

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]

        try {
            const titleTrimmed = row.title.trim()
            const brandTrimmed = (row.brand || '').trim()

            // Duplicate check: same title + brand
            const key = `${titleTrimmed.toLowerCase()}||${brandTrimmed.toLowerCase()}`
            if (existingSet.has(key)) {
                skipped.push(`Ligne ${i + 1}: "${titleTrimmed}" (${brandTrimmed || 'sans marque'}) existe déjà — ignorée`)
                continue
            }

            // Parse tags separated by ;
            const tags = row.tags
                ? row.tags.split(';').map(t => t.trim()).filter(Boolean)
                : []

            // Validate and normalize status
            const status = VALID_STATUSES.includes(row.status?.trim() || '')
                ? row.status!.trim()
                : 'Brouillon'

            // Validate and normalize accessLevel
            const accessLevel = VALID_ACCESS_LEVELS.includes(row.accessLevel?.trim().toLowerCase() || '')
                ? row.accessLevel!.trim().toLowerCase()
                : 'free'

            // Parse year as number
            const year = row.year ? parseInt(row.year, 10) : null

            // Convert Google Drive URLs to direct image URLs
            const thumbnail = row.imageUrl?.trim()
                ? getGoogleDriveImageUrl(row.imageUrl.trim())
                : null
            const videoUrl = row.videoUrl?.trim()
                ? getGoogleDriveImageUrl(row.videoUrl.trim())
                : null

            // Generate unique slug
            let slug = generateSlug(titleTrimmed)
            let slugCounter = 2
            while (true) {
                const { data: existing } = await supabase
                    .from('campaigns')
                    .select('id')
                    .eq('slug', slug)
                    .maybeSingle()
                if (!existing) break
                slug = `${generateSlug(titleTrimmed)}-${slugCounter}`
                slugCounter++
            }

            const { error } = await supabase.from('campaigns').insert({
                title: titleTrimmed,
                slug,
                brand: brandTrimmed || null,
                agency: row.agency?.trim() || null,
                platforms: row.platform ? [row.platform.trim()] : [],
                country: row.country?.trim() || null,
                category: row.sector?.trim() || null,
                format: row.format?.trim() || null,
                year: (year && !isNaN(year)) ? year : null,
                thumbnail,
                video_url: videoUrl,
                description: row.description?.trim() || null,
                tags,
                status,
                access_level: accessLevel,
            })

            if (error) {
                errors.push(`Ligne ${i + 1}: ${error.message}`)
            } else {
                imported++
                // Add to set to prevent duplicates within the same import
                existingSet.add(key)
            }
        } catch (error: any) {
            errors.push(`Ligne ${i + 1}: ${error.message || 'Erreur inconnue'}`)
        }
    }

    revalidatePath("/admin/creatives")
    revalidatePath("/admin/campaigns")
    revalidatePath("/library")
    revalidatePath("/dashboard")

    if (errors.length > 0 || skipped.length > 0) {
        return {
            success: imported > 0,
            imported,
            skipped,
            errors,
            error: [
                errors.length > 0 ? `${errors.length} erreur(s)` : null,
                skipped.length > 0 ? `${skipped.length} doublon(s) ignoré(s)` : null,
            ].filter(Boolean).join(', ') + ` sur ${rows.length} lignes`
        }
    }

    return { success: true, imported }
}
