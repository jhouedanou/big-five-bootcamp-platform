"use client"

import { Button } from "@/components/ui/button"
import { toggleUserStatus } from "@/app/actions/user"
import { toast } from "sonner"
import { useState } from "react"
import { Power, PowerOff } from "lucide-react"

export function UserStatusToggle({ id, status }: { id: string, status: string }) {
    const [isLoading, setIsLoading] = useState(false)

    const handleToggle = async () => {
        setIsLoading(true)
        const result = await toggleUserStatus(id, status)
        setIsLoading(false)

        if (result.success) {
            toast.success("Statut mis à jour")
        } else {
            toast.error("Erreur")
        }
    }

    const isActive = status === 'active'

    return (
        <Button
            variant="ghost"
            size="sm"
            className={`${isActive ? "text-destructive hover:bg-destructive/10" : "text-green-600 hover:bg-green-100"}`}
            onClick={handleToggle}
            disabled={isLoading}
            title={isActive ? "Désactiver" : "Activer"}
        >
            {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
        </Button>
    )
}
