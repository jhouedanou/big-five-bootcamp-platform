"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getCreatives() {
    try {
        const creatives = await prisma.creative.findMany({
            orderBy: { createdAt: "desc" },
        })
        return { success: true, data: creatives }
    } catch (error) {
        return { success: false, error: "Failed to fetch creatives" }
    }
}

export async function getCreativeById(id: string) {
    try {
        const creative = await prisma.creative.findUnique({
            where: { id },
        })
        return { success: true, data: creative }
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
        await prisma.creative.create({
            data: {
                title,
                platform,
                format,
                sector,
                objective,
                thumbnail,
                videoUrl: videoUrl || null,
                whyItWorks: whyItWorks || null,
                howToUse: howToUse || null,
                status: "published",
            },
        })
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
        await prisma.creative.update({
            where: { id },
            data: {
                title,
                platform,
                format,
                sector,
                objective,
                thumbnail,
                videoUrl: videoUrl || null,
                whyItWorks: whyItWorks || null,
                howToUse: howToUse || null,
            },
        })
        revalidatePath("/admin/creatives")
        revalidatePath("/library")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update creative" }
    }
}

export async function deleteCreative(id: string) {
    try {
        await prisma.creative.delete({
            where: { id },
        })
        revalidatePath("/admin/creatives")
        revalidatePath("/library")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to delete creative" }
    }
}
