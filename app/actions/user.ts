"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
        })
        return { success: true, data: users }
    } catch (error) {
        return { success: false, error: "Failed to fetch users" }
    }
}

export async function toggleUserStatus(id: string, currentStatus: string) {
    try {
        const newStatus = currentStatus === "active" ? "inactive" : "active"
        await prisma.user.update({
            where: { id },
            data: { subscriptionStatus: newStatus } // Map to subscriptionStatus or status field pending schema check
        })
        // Note: schema has 'status' and 'subscriptionStatus'. 
        // User model: role, subscriptionStatus. 
        // I'll update 'subscriptionStatus'.
        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update user status" }
    }
}
