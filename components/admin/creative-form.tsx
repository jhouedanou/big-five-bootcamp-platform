"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createCreative, updateCreative } from "@/app/actions/creative"
import { toast } from "sonner"
import { SUPPORTED_PLATFORMS, FILTERS } from "@/lib/constants"
import { Loader2 } from "lucide-react"

interface CreativeFormProps {
    creative?: any
    isEdit?: boolean
}

export function CreativeForm({ creative, isEdit = false }: CreativeFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)

        let result
        if (isEdit && creative?.id) {
            result = await updateCreative(creative.id, formData)
        } else {
            result = await createCreative(formData)
        }

        if (result.success) {
            toast.success(isEdit ? "Créative mise à jour" : "Créative créée")
            router.push("/admin/creatives")
        } else {
            toast.error(result.error || "Une erreur est survenue")
        }
        setIsLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 rounded-lg border shadow-sm max-w-2xl">
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">{isEdit ? 'Modifier la créative' : 'Nouvelle créative'}</h2>

                <div className="grid gap-2">
                    <Label htmlFor="title">Titre</Label>
                    <Input id="title" name="title" defaultValue={creative?.title} required placeholder="Ex: Campagne Black Friday" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="platform">Plateforme</Label>
                        <Select name="platform" defaultValue={creative?.platform} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={SUPPORTED_PLATFORMS.FACEBOOK}>Facebook</SelectItem>
                                <SelectItem value={SUPPORTED_PLATFORMS.LINKEDIN}>LinkedIn</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="format">Format</Label>
                        <Select name="format" defaultValue={creative?.format} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                {FILTERS.FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="sector">Secteur</Label>
                        <Select name="sector" defaultValue={creative?.sector} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                {FILTERS.SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="objective">Objectif</Label>
                        <Select name="objective" defaultValue={creative?.objective} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                {FILTERS.OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="thumbnail">URL Miniature (Image)</Label>
                    <Input id="thumbnail" name="thumbnail" defaultValue={creative?.thumbnail} required placeholder="https://..." />
                    <p className="text-xs text-muted-foreground">Pour l'instant, coller une URL directe.</p>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="videoUrl">URL Vidéo (Optionnel)</Label>
                    <Input id="videoUrl" name="videoUrl" defaultValue={creative?.videoUrl} placeholder="https://..." />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="whyItWorks">Pourquoi ça marche</Label>
                    <Textarea id="whyItWorks" name="whyItWorks" defaultValue={creative?.whyItWorks} placeholder="Analyse de la créative..." className="min-h-[100px]" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="howToUse">Comment réutiliser</Label>
                    <Textarea id="howToUse" name="howToUse" defaultValue={creative?.howToUse} placeholder="Conseils d'application..." className="min-h-[100px]" />
                </div>

            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEdit ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </form>
    )
}
