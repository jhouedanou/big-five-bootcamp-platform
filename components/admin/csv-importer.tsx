"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { importCreativesFromCSV } from "@/app/actions/creative"
import { cn } from "@/lib/utils"

interface CSVRow {
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
    axe?: string
}

interface CSVImporterProps {
    onImportComplete?: () => void
}

const CSV_TEMPLATE_HEADERS = [
    "title",
    "brand",
    "agency",
    "platform",
    "country",
    "sector",
    "format",
    "date",
    "year",
    "imageUrl",
    "videoUrl",
    "description",
    "tags",
    "status",
    "accessLevel",
    "axe"
]

const CSV_EXAMPLE_DATA = [
    {
        title: "Campagne Black Friday",
        brand: "Nike",
        agency: "Ogilvy",
        platform: "Facebook",
        country: "Côte d'Ivoire",
        sector: "E-commerce",
        format: "Vidéo",
        date: "2025-11-29",
        year: "2025",
        imageUrl: "https://example.com/image.jpg",
        videoUrl: "https://example.com/video.mp4",
        description: "Campagne de promotion pour le Black Friday avec des offres exclusives",
        tags: "promo;blackfriday;soldes",
        status: "Publié",
        accessLevel: "premium",
        axe: "Offre / Promotion;Storytelling"
    }
]

const VALID_STATUSES = ['Brouillon', 'En attente', 'Publié']
const VALID_ACCESS_LEVELS = ['free', 'premium']

export function CSVImporter({ onImportComplete }: CSVImporterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [parsedData, setParsedData] = useState<CSVRow[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const [warnings, setWarnings] = useState<string[]>([])
    const [fileName, setFileName] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const downloadTemplate = () => {
        const link = document.createElement('a')
        link.href = '/template_creatives.csv'
        link.download = 'template_creatives.csv'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success("Template téléchargé")
    }

    const validateRow = (row: any, index: number): { errors: string[]; warnings: string[] } => {
        const rowErrors: string[] = []
        const rowWarnings: string[] = []

        if (!row.title?.trim()) {
            rowErrors.push(`Ligne ${index + 1}: Titre manquant (obligatoire)`)
        }
        if (row.year && (isNaN(parseInt(row.year)) || parseInt(row.year) < 1900 || parseInt(row.year) > 2100)) {
            rowErrors.push(`Ligne ${index + 1}: Année invalide "${row.year}" (nombre entre 1900 et 2100)`)
        }
        if (row.status?.trim() && !VALID_STATUSES.includes(row.status.trim())) {
            rowWarnings.push(`Ligne ${index + 1}: Status "${row.status}" non reconnu, sera mis à "Brouillon". Valeurs acceptées: ${VALID_STATUSES.join(', ')}`)
        }
        if (row.accessLevel?.trim() && !VALID_ACCESS_LEVELS.includes(row.accessLevel.trim().toLowerCase())) {
            rowWarnings.push(`Ligne ${index + 1}: accessLevel "${row.accessLevel}" non reconnu, sera mis à "free". Valeurs acceptées: ${VALID_ACCESS_LEVELS.join(', ')}`)
        }

        return { errors: rowErrors, warnings: rowWarnings }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        setErrors([])
        setWarnings([])
        setParsedData([])

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as CSVRow[]
                const allErrors: string[] = []
                const allWarnings: string[] = []

                if (results.errors.length > 0) {
                    results.errors.forEach(err => {
                        allErrors.push(`Erreur de parsing: ${err.message} (ligne ${err.row})`)
                    })
                }

                data.forEach((row, index) => {
                    const validation = validateRow(row, index)
                    allErrors.push(...validation.errors)
                    allWarnings.push(...validation.warnings)
                })

                setErrors(allErrors)
                setWarnings(allWarnings)
                setParsedData(data)
            },
            error: (error) => {
                setErrors([`Erreur de lecture du fichier: ${error.message}`])
            }
        })
    }

    const handleImport = async () => {
        if (errors.length > 0 || parsedData.length === 0) {
            toast.error("Veuillez corriger les erreurs avant d'importer")
            return
        }

        setIsLoading(true)

        try {
            const result = await importCreativesFromCSV(parsedData)

            if (result.success) {
                toast.success(`${result.imported} créative(s) importée(s)`)
                setIsOpen(false)
                setParsedData([])
                setFileName("")
                setWarnings([])
                onImportComplete?.()
            } else {
                toast.error(result.error || "Erreur lors de l'import")
                if (result.errors) {
                    setErrors(result.errors)
                }
            }
        } catch (error) {
            toast.error("Erreur lors de l'import")
        } finally {
            setIsLoading(false)
        }
    }

    const resetForm = () => {
        setParsedData([])
        setErrors([])
        setWarnings([])
        setFileName("")
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <>
            <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                className="gap-2"
            >
                <Upload className="w-4 h-4" />
                Import CSV
            </Button>

            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open)
                if (!open) resetForm()
            }}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5" />
                            Importer des créatives via CSV
                        </DialogTitle>
                        <DialogDescription>
                            Importez plusieurs créatives en une seule fois. Seul le champ <strong>title</strong> est obligatoire.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto space-y-4 py-4">
                        {/* Template Download */}
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div>
                                <p className="font-medium">Télécharger le template</p>
                                <p className="text-sm text-muted-foreground">
                                    16 colonnes : title, brand, agency, platform, country, sector, format, date, year, imageUrl, videoUrl, description, tags (séparés par ;), status (Brouillon/En attente/Publié), accessLevel (free/premium), axe (séparés par ;)
                                </p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={downloadTemplate} className="gap-2 shrink-0">
                                <Download className="w-4 h-4" />
                                Template CSV
                            </Button>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label htmlFor="csv-file">Fichier CSV</Label>
                            <div className="flex gap-2">
                                <Input
                                    ref={fileInputRef}
                                    id="csv-file"
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="flex-1"
                                />
                                {fileName && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={resetForm}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Errors */}
                        {errors.length > 0 && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                                <div className="flex items-center gap-2 text-destructive font-medium">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.length} erreur(s) détectée(s)
                                </div>
                                <ul className="text-sm text-destructive/80 list-disc list-inside max-h-32 overflow-auto">
                                    {errors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Warnings */}
                        {warnings.length > 0 && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-2">
                                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium">
                                    <AlertCircle className="w-4 h-4" />
                                    {warnings.length} avertissement(s)
                                </div>
                                <ul className="text-sm text-yellow-600 dark:text-yellow-400/80 list-disc list-inside max-h-32 overflow-auto">
                                    {warnings.map((warning, i) => (
                                        <li key={i}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Preview Table */}
                        {parsedData.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Aperçu ({parsedData.length} ligne(s))</Label>
                                    {errors.length === 0 && (
                                        <div className="flex items-center gap-1 text-sm text-green-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Prêt à importer
                                        </div>
                                    )}
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto max-h-64">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Titre</TableHead>
                                                    <TableHead>Marque</TableHead>
                                                    <TableHead>Agence</TableHead>
                                                    <TableHead>Plateforme</TableHead>
                                                    <TableHead>Pays</TableHead>
                                                    <TableHead>Secteur</TableHead>
                                                    <TableHead>Format</TableHead>
                                                    <TableHead>Année</TableHead>
                                                    <TableHead>Axe</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Accès</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {parsedData.slice(0, 10).map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="text-muted-foreground">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell className={cn(!row.title && "text-destructive")}>
                                                            {row.title || "—"}
                                                        </TableCell>
                                                        <TableCell>{row.brand || "—"}</TableCell>
                                                        <TableCell>{row.agency || "—"}</TableCell>
                                                        <TableCell>{row.platform || "—"}</TableCell>
                                                        <TableCell>{row.country || "—"}</TableCell>
                                                        <TableCell>{row.sector || "—"}</TableCell>
                                                        <TableCell>{row.format || "—"}</TableCell>
                                                        <TableCell>{row.year || "—"}</TableCell>
                                                        <TableCell>{row.axe || "—"}</TableCell>
                                                        <TableCell>{row.status || "—"}</TableCell>
                                                        <TableCell>{row.accessLevel || "—"}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {parsedData.length > 10 && (
                                        <div className="p-2 text-center text-sm text-muted-foreground border-t bg-muted/50">
                                            ... et {parsedData.length - 10} autre(s) ligne(s)
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isLoading || parsedData.length === 0 || errors.length > 0}
                            className="gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Importer {parsedData.length > 0 && `(${parsedData.length})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
