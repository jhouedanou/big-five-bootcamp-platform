"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteCreative } from "@/app/actions/creative"
import { toast } from "sonner"
import { useState } from "react"

export function DeleteButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette créative ?")) return

        setIsDeleting(true)
        const result = await deleteCreative(id)
        setIsDeleting(false)

        if (result.success) {
            toast.success("Créative supprimée")
        } else {
            toast.error("Erreur lors de la suppression")
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isDeleting}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}
