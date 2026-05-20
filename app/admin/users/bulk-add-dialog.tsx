"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { UserPlus, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import {
    bulkCreateUsers,
    type BulkUserInput,
    type BulkUserPlan,
    type BulkUserResult,
} from "@/app/actions/user"

const PLAN_OPTIONS: BulkUserPlan[] = ["Discovery", "Basic", "Pro"]

function parseLines(raw: string, defaultPlan: BulkUserPlan): BulkUserInput[] {
    const out: BulkUserInput[] = []
    for (const rawLine of raw.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith("#")) continue
        // Format accepté par ligne : "email" ou "email,plan"
        const [emailPart, planPart] = line.split(/[,;\t]/).map((s) => s.trim())
        if (!emailPart) continue
        let plan: BulkUserPlan = defaultPlan
        const p = (planPart || "").toLowerCase()
        if (p === "pro") plan = "Pro"
        else if (p === "basic") plan = "Basic"
        else if (p === "discovery" || p === "découverte" || p === "decouverte") plan = "Discovery"
        out.push({ email: emailPart.toLowerCase(), plan })
    }
    return out
}

export function BulkAddUsersDialog() {
    const [open, setOpen] = useState(false)
    const [raw, setRaw] = useState("")
    const [defaultPlan, setDefaultPlan] = useState<BulkUserPlan>("Basic")
    const [durationDays, setDurationDays] = useState<number>(30)
    const [password, setPassword] = useState<string>("")
    const [results, setResults] = useState<BulkUserResult[] | null>(null)
    const [summary, setSummary] =
        useState<{ created: number; updated: number; errors: number } | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const parsed = parseLines(raw, defaultPlan)
    const validCount = parsed.length

    function handleReset() {
        setRaw("")
        setResults(null)
        setSummary(null)
        setErrorMsg(null)
    }

    function handleSubmit() {
        setErrorMsg(null)
        setResults(null)
        setSummary(null)
        if (parsed.length === 0) {
            setErrorMsg("Aucun email valide détecté.")
            return
        }
        startTransition(async () => {
            const res = await bulkCreateUsers({
                users: parsed,
                defaultPlan,
                durationDays,
                defaultPassword: password.trim() || undefined,
            })
            if (!res.success) {
                setErrorMsg(res.error || "Erreur inconnue")
                return
            }
            setResults(res.results || [])
            setSummary(res.summary || null)
        })
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o)
                if (!o) {
                    // Reset à la fermeture pour éviter d'envoyer 2× la même liste.
                    setTimeout(() => handleReset(), 200)
                }
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Ajout en masse
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Ajouter des utilisateurs en masse</DialogTitle>
                    <DialogDescription>
                        Crée (ou met à jour si déjà existants) plusieurs comptes en une fois.
                        Format : une ligne par utilisateur, <code className="text-xs">email</code>{" "}
                        ou <code className="text-xs">email,plan</code> (Discovery/Basic/Pro).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-plan">Plan par défaut</Label>
                            <Select
                                value={defaultPlan}
                                onValueChange={(v) => setDefaultPlan(v as BulkUserPlan)}
                            >
                                <SelectTrigger id="bulk-plan">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PLAN_OPTIONS.map((p) => (
                                        <SelectItem key={p} value={p}>
                                            {p}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-duration">Durée (jours)</Label>
                            <Input
                                id="bulk-duration"
                                type="number"
                                min={1}
                                max={3650}
                                value={durationDays}
                                onChange={(e) => {
                                    const n = parseInt(e.target.value, 10)
                                    setDurationDays(Number.isFinite(n) ? n : 30)
                                }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-password">Mot de passe initial</Label>
                            <Input
                                id="bulk-password"
                                type="text"
                                placeholder="Par défaut"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="bulk-emails">
                            Liste d&apos;emails ({validCount} valide{validCount > 1 ? "s" : ""} détecté
                            {validCount > 1 ? "s" : ""})
                        </Label>
                        <Textarea
                            id="bulk-emails"
                            value={raw}
                            onChange={(e) => setRaw(e.target.value)}
                            rows={10}
                            placeholder={
                                "alice@exemple.com\nbob@exemple.com,Pro\ncarol@exemple.com,Basic"
                            }
                            className="font-mono text-xs"
                            disabled={isPending}
                        />
                    </div>

                    {errorMsg && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                            {errorMsg}
                        </div>
                    )}

                    {summary && (
                        <div className="rounded-md border bg-muted/30 p-3 text-sm">
                            <div className="flex flex-wrap gap-4">
                                <span className="text-green-600">
                                    ✓ {summary.created} créé{summary.created > 1 ? "s" : ""}
                                </span>
                                <span className="text-blue-600">
                                    ↻ {summary.updated} mis à jour
                                </span>
                                <span className="text-destructive">
                                    ✗ {summary.errors} erreur{summary.errors > 1 ? "s" : ""}
                                </span>
                            </div>
                        </div>
                    )}

                    {results && results.length > 0 && (
                        <div className="max-h-64 overflow-auto rounded-md border">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-muted">
                                    <tr>
                                        <th className="px-2 py-1 text-left">Email</th>
                                        <th className="px-2 py-1 text-left">Statut</th>
                                        <th className="px-2 py-1 text-left">Plan</th>
                                        <th className="px-2 py-1 text-left">Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r) => (
                                        <tr key={r.email} className="border-t">
                                            <td className="px-2 py-1 font-mono">{r.email}</td>
                                            <td className="px-2 py-1">
                                                {r.status === "created" && (
                                                    <span className="inline-flex items-center gap-1 text-green-600">
                                                        <CheckCircle2 className="h-3 w-3" /> créé
                                                    </span>
                                                )}
                                                {r.status === "updated" && (
                                                    <span className="inline-flex items-center gap-1 text-blue-600">
                                                        <RefreshCw className="h-3 w-3" /> mis à jour
                                                    </span>
                                                )}
                                                {r.status === "error" && (
                                                    <span className="inline-flex items-center gap-1 text-destructive">
                                                        <XCircle className="h-3 w-3" /> erreur
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1">{r.plan || "—"}</td>
                                            <td className="px-2 py-1 text-muted-foreground">
                                                {r.message || ""}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={isPending}
                        type="button"
                    >
                        Réinitialiser
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending || validCount === 0}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Créer {validCount > 0 ? `${validCount} utilisateur${validCount > 1 ? "s" : ""}` : ""}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
