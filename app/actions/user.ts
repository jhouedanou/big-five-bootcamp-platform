"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

export async function getUsers() {
    try {
        const supabase = getSupabaseAdmin()
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data: users }
    } catch (error) {
        return { success: false, error: "Failed to fetch users" }
    }
}

export async function toggleUserStatus(id: string, currentStatus: string) {
    try {
        const supabase = getSupabaseAdmin()
        const newStatus = currentStatus === "active" ? "inactive" : "active"
        const { error } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) throw error
        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update user status" }
    }
}
