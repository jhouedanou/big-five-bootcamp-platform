"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Megaphone, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { campaignActivateAllUsers } from "@/app/actions/user"

export function CampaignActivateDialog() {
    const [open, setOpen] = useState(false)
    const [days, setDays] = useState(90)
    const [confirmed, setConfirmed] = useState(false)
    const [result, setResult] = useState<{
        activated?: number
        skipped?: number
        errors?: number
        total?: number
        error?: string
    } | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleClose(o: boolean) {
        setOpen(o)
        if (!o) {
            setTimeout(() => {
                setResult(null)
                setConfirmed(false)
            }, 200)
        }
    }

    function handleRun() {
        setResult(null)
        startTransition(async () => {
            const res = await campaignActivateAllUsers(days)
            setResult(res)
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="gap-2">
                    <Megaphone className="h-4 w-4" />
                    Campagne LAVEIYE
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Activer la campagne LAVEIYE</DialogTitle>
                    <DialogDescription>
                        Active le plan Basic gratuitement pour tous les comptes non-Pro actifs.
                        Les comptes Pro actifs et non-expirés sont conservés tels quels.
                    </DialogDescription>
                </DialogHeader>

                {!result && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="campaign-days">Durée (jours)</Label>
                            <Input
                                id="campaign-days"
                                type="number"
                                min={1}
                                max={730}
                                value={days}
                                onChange={(e) => {
                                    const n = parseInt(e.target.value, 10)
                                    setDays(Number.isFinite(n) && n > 0 ? n : 90)
                                }}
                                disabled={isPending}
                            />
                        </div>

                        <div
                            className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                        >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                Opération en masse irréversible. Tous les abonnements actifs seront
                                remplacés par Basic ({days}j). Les entrées de paiement audit seront créées.
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                disabled={isPending}
                                className="h-4 w-4"
                            />
                            Je comprends et confirme l&apos;activation en masse
                        </label>
                    </div>
                )}

                {result && !result.error && (
                    <div className="rounded-md border bg-muted/30 p-4 space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Activation terminée
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                            <span>Total comptes :</span>
                            <span className="font-mono">{result.total}</span>
                            <span>Activés :</span>
                            <span className="font-mono text-green-600">{result.activated}</span>
                            <span>Ignorés (Pro actif) :</span>
                            <span className="font-mono">{result.skipped}</span>
                            {(result.errors ?? 0) > 0 && (
                                <>
                                    <span>Erreurs :</span>
                                    <span className="font-mono text-destructive">{result.errors}</span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {result?.error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {result.error}
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
                        {result ? "Fermer" : "Annuler"}
                    </Button>
                    {!result && (
                        <Button
                            onClick={handleRun}
                            disabled={isPending || !confirmed}
                            className="gap-2"
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Activer la campagne
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
