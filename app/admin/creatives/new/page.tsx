import { CreativeFormMultiStep } from "@/components/admin/creative-form-multi-step"
import { CSVImporter } from "@/components/admin/csv-importer"

export default function NewCreativePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Nouvelle Créative</h1>
                    <p className="text-muted-foreground">Ajouter une publicité à la bibliothèque.</p>
                </div>
                <CSVImporter />
            </div>
            <CreativeFormMultiStep />
        </div>
    )
}
