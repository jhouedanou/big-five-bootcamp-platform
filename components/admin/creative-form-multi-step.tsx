"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Loader2, ChevronLeft, ChevronRight, Check, FileText, Image, Sparkles } from "lucide-react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { cn } from "@/lib/utils"

interface CreativeFormProps {
    creative?: any
    isEdit?: boolean
}

const STEPS = [
    { id: 1, title: "Informations", icon: FileText, description: "Détails de base" },
    { id: 2, title: "Médias", icon: Image, description: "Images et vidéos" },
    { id: 3, title: "Description", icon: Sparkles, description: "Analyse et conseils" },
]

export function CreativeFormMultiStep({ creative, isEdit = false }: CreativeFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    
    // Form state
    const [formData, setFormData] = useState({
        title: creative?.title || "",
        platform: creative?.platforms?.[0] || creative?.platform || "",
        format: creative?.tags?.[0] || creative?.format || "",
        sector: creative?.category || creative?.sector || "",
        objective: creative?.tags?.[1] || creative?.objective || "",
        thumbnail: creative?.thumbnail || "",
        videoUrl: creative?.video_url || creative?.videoUrl || "",
        whyItWorks: creative?.description?.split('\n\n')[0] || creative?.whyItWorks || "",
        howToUse: creative?.description?.split('\n\n')[1] || creative?.howToUse || "",
    })

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setIsLoading(true)

        const fd = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            fd.append(key, value)
        })

        let result
        if (isEdit && creative?.id) {
            result = await updateCreative(creative.id, fd)
        } else {
            result = await createCreative(fd)
        }

        if (result.success) {
            toast.success(isEdit ? "Créative mise à jour" : "Créative créée avec succès")
            router.push("/admin/campaigns")
        } else {
            toast.error(result.error || "Une erreur est survenue")
        }
        setIsLoading(false)
    }

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return formData.title && formData.platform && formData.format && formData.sector && formData.objective
            case 2:
                return formData.thumbnail
            case 3:
                return true
            default:
                return false
        }
    }

    const nextStep = () => {
        if (currentStep < 3 && canProceed()) {
            setCurrentStep(prev => prev + 1)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1)
        }
    }

    return (
        <div className="bg-card rounded-lg border shadow-sm max-w-3xl">
            {/* Stepper Header */}
            <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div 
                                className={cn(
                                    "flex items-center cursor-pointer",
                                    currentStep >= step.id ? "opacity-100" : "opacity-50"
                                )}
                                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                            >
                                <div 
                                    className={cn(
                                        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                                        currentStep === step.id 
                                            ? "border-primary bg-primary text-primary-foreground" 
                                            : currentStep > step.id 
                                                ? "border-green-500 bg-green-500 text-white"
                                                : "border-muted-foreground/30 text-muted-foreground"
                                    )}
                                >
                                    {currentStep > step.id ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="ml-3 hidden sm:block">
                                    <p className={cn(
                                        "text-sm font-medium",
                                        currentStep === step.id ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                        {step.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                            {index < STEPS.length - 1 && (
                                <div 
                                    className={cn(
                                        "w-12 sm:w-24 h-0.5 mx-4",
                                        currentStep > step.id ? "bg-green-500" : "bg-muted-foreground/30"
                                    )} 
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="p-6 space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-lg font-semibold">Informations de base</h2>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="title">Titre *</Label>
                            <Input 
                                id="title" 
                                value={formData.title} 
                                onChange={(e) => updateField("title", e.target.value)}
                                placeholder="Ex: Campagne Black Friday" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="platform">Plateforme *</Label>
                                <Select 
                                    value={formData.platform} 
                                    onValueChange={(v) => updateField("platform", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FILTERS.PLATFORMS.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="format">Format *</Label>
                                <Select 
                                    value={formData.format} 
                                    onValueChange={(v) => updateField("format", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FILTERS.FORMATS.map(f => (
                                            <SelectItem key={f} value={f}>{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="sector">Secteur *</Label>
                                <Select 
                                    value={formData.sector} 
                                    onValueChange={(v) => updateField("sector", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FILTERS.SECTORS.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="objective">Objectif *</Label>
                                <Select 
                                    value={formData.objective} 
                                    onValueChange={(v) => updateField("objective", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FILTERS.OBJECTIVES.map(o => (
                                            <SelectItem key={o} value={o}>{o}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Media */}
                {currentStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-lg font-semibold">Médias</h2>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="thumbnail">URL Miniature (Image) *</Label>
                            <Input 
                                id="thumbnail" 
                                value={formData.thumbnail} 
                                onChange={(e) => updateField("thumbnail", e.target.value)}
                                placeholder="https://..." 
                            />
                            <p className="text-xs text-muted-foreground">
                                Collez l'URL directe de l'image (formats supportés: jpg, png, webp)
                            </p>
                        </div>

                        {formData.thumbnail && (
                            <div className="mt-4">
                                <Label>Aperçu</Label>
                                <div className="mt-2 rounded-lg border overflow-hidden bg-muted/50 max-w-sm">
                                    <img 
                                        src={formData.thumbnail} 
                                        alt="Preview" 
                                        className="w-full h-auto object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="videoUrl">URL Vidéo (Optionnel)</Label>
                            <Input 
                                id="videoUrl" 
                                value={formData.videoUrl} 
                                onChange={(e) => updateField("videoUrl", e.target.value)}
                                placeholder="https://..." 
                            />
                            <p className="text-xs text-muted-foreground">
                                URL d'une vidéo YouTube, Vimeo ou fichier vidéo direct
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 3: Description */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-lg font-semibold">Analyse et Conseils</h2>
                        
                        <div className="grid gap-2">
                            <Label>Pourquoi ça marche</Label>
                            <RichTextEditor
                                content={formData.whyItWorks}
                                onChange={(content) => updateField("whyItWorks", content)}
                                placeholder="Analysez les éléments clés de cette créative..."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Comment réutiliser</Label>
                            <RichTextEditor
                                content={formData.howToUse}
                                onChange={(content) => updateField("howToUse", content)}
                                placeholder="Donnez des conseils pour adapter cette créative..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Footer */}
            <div className="p-6 border-t flex justify-between items-center">
                <Button
                    type="button"
                    variant="outline"
                    onClick={currentStep === 1 ? () => router.back() : prevStep}
                    className="gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {currentStep === 1 ? "Annuler" : "Précédent"}
                </Button>

                <div className="text-sm text-muted-foreground">
                    Étape {currentStep} sur {STEPS.length}
                </div>

                {currentStep < 3 ? (
                    <Button
                        type="button"
                        onClick={nextStep}
                        disabled={!canProceed()}
                        className="gap-2"
                    >
                        Suivant
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isEdit ? 'Enregistrer' : 'Créer la créative'}
                    </Button>
                )}
            </div>
        </div>
    )
}
