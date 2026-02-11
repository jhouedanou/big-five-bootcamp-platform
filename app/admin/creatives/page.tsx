import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"
import { getCreatives } from "@/app/actions/creative"
import Image from "next/image"
import { DeleteButton } from "./delete-button"

export default async function CreativesPage() {
    const { data: creatives, success } = await getCreatives()

    if (!success || !creatives) {
        return <div>Failed to load creatives</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Créatives</h1>
                    <p className="text-muted-foreground">
                        Gérez la bibliothèque de publicités.
                    </p>
                </div>
                <Link href="/admin/creatives/new">
                    <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                        <Plus className="h-4 w-4" />
                        Nouvelle Créative
                    </Button>
                </Link>
            </div>

            <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Miniature</TableHead>
                            <TableHead>Titre</TableHead>
                            <TableHead>Plateforme</TableHead>
                            <TableHead>Format</TableHead>
                            <TableHead>Secteur</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {creatives.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Aucune créative trouvée. Ajoutez-en une nouvelle !
                                </TableCell>
                            </TableRow>
                        ) : (
                            creatives.map((creative) => (
                                <TableRow key={creative.id}>
                                    <TableCell>
                                        <div className="relative h-12 w-20 overflow-hidden rounded-md border bg-muted">
                                            <Image
                                                src={creative.thumbnail || "/placeholder.png"}
                                                alt={creative.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{creative.title}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${creative.platform === 'Facebook' ? 'bg-blue-100 text-blue-800' : 'bg-sky-100 text-sky-800'
                                            }`}>
                                            {creative.platform}
                                        </span>
                                    </TableCell>
                                    <TableCell>{creative.format}</TableCell>
                                    <TableCell>{creative.sector}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {creative.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/creatives/${creative.id}/edit`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <DeleteButton id={creative.id} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
