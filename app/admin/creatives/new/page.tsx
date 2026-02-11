import { CreativeForm } from "@/components/admin/creative-form"

export default function NewCreativePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Nouvelle Créative</h1>
                <p className="text-muted-foreground">Ajouter une publicité à la bibliothèque.</p>
            </div>
            <CreativeForm />
        </div>
    )
}
