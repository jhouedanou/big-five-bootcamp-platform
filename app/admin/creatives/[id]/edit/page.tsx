import { CreativeFormMultiStep } from "@/components/admin/creative-form-multi-step"
import { getCreativeById } from "@/app/actions/creative"

export default async function EditCreativePage({ params }: { params: { id: string } }) {
    const { data: creative, success } = await getCreativeById(params.id)

    if (!success || !creative) {
        return <div>Créative non trouvée</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Modifier la Créative</h1>
                <p className="text-muted-foreground">{creative.title}</p>
            </div>
            <CreativeFormMultiStep creative={creative} isEdit />
        </div>
    )
}
