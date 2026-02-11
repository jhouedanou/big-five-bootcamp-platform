"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

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
    const whyItWorks = formData.get("whyItWorks") as string
    const howToUse = formData.get("howToUse") as string

    try {
        const supabase = getSupabaseAdmin()
        const { error } = await supabase.from('campaigns').insert({
            title,
            category: sector,
            platforms: [platform],
            thumbnail,
            video_url: videoUrl || null,
            description: [whyItWorks, howToUse].filter(Boolean).join('\n\n') || null,
            tags: [format, objective].filter(Boolean),
            status: 'Publié',
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
    const whyItWorks = formData.get("whyItWorks") as string
    const howToUse = formData.get("howToUse") as string

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
                description: [whyItWorks, howToUse].filter(Boolean).join('\n\n') || null,
                tags: [format, objective].filter(Boolean),
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
