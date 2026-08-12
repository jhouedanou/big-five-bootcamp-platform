"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Save, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Field {
  key: string;
  label: string;
  help: string;
  secret: boolean;
  envVar: string;
  group: "tracking" | "ia";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface Status {
  key: string;
  display: string;
  configured: boolean;
  fromEnv: boolean;
}

const GROUPS: Array<{ key: Field["group"]; title: string; blurb: string }> = [
  {
    key: "tracking",
    title: "Mesure et publicité",
    blurb:
      "Identifiants Google Analytics et Meta. Les modifier ici prend effet en moins d’une minute, sans mise en ligne — c’est aussi par ici qu’on remplace un jeton compromis.",
  },
  {
    key: "ia",
    title: "Intelligence artificielle",
    blurb:
      "Clés des fournisseurs utilisés par le générateur de campagnes et le studio publicitaire.",
  },
];

export default function AdminIntegrationsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyStatuses = (list: Status[]) =>
    setStatuses(Object.fromEntries(list.map((s) => [s.key, s])));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/integrations");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Chargement impossible");
        return;
      }
      setFields(data.fields || []);
      applyStatuses(data.statuses || []);
      setDrafts({});
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    // On n'envoie que les champs réellement saisis : sans ça, un champ secret
    // laissé sur son affichage masqué écraserait la vraie clé par des points.
    const values = Object.fromEntries(
      Object.entries(drafts).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(values).length === 0) {
      toast.info("Aucune modification à enregistrer");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Enregistrement échoué");
        return;
      }
      applyStatuses(data.statuses || []);
      setDrafts({});
      toast.success("Identifiants enregistrés");
    } catch {
      toast.error("Erreur réseau — rien n'a été enregistré");
    } finally {
      setSaving(false);
    }
  };

  const dirty = Object.keys(drafts).length > 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <KeyRound className="h-6 w-6 text-[#F2B33D]" />
          Intégrations
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Clés et identifiants des services externes. Ils sont chiffrés en base et ne
          sont jamais réaffichés en entier : seuls les quatre derniers caractères
          restent visibles, de quoi vérifier qu’il s’agit bien de la bonne clé.
        </p>
      </header>

      <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardContent className="flex gap-3 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Ces valeurs sont des secrets.</p>
            <p>
              Ne les transmettez jamais par email ou dans un document partagé. Si une clé
              a circulé, régénérez-la chez le fournisseur puis remplacez-la ici : le
              changement prend effet immédiatement, sans mise en ligne.
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement…
        </div>
      ) : (
        <>
          {GROUPS.map((group) => {
            const groupFields = fields.filter((f) => f.group === group.key);
            if (groupFields.length === 0) return null;

            return (
              <section key={group.key} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{group.title}</h2>
                  <p className="max-w-3xl text-sm text-muted-foreground">{group.blurb}</p>
                </div>

                <div className="space-y-4">
                  {groupFields.map((field) => {
                    const status = statuses[field.key];
                    const draft = drafts[field.key];

                    return (
                      <Card key={field.key}>
                        <CardContent className="space-y-2 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Label htmlFor={field.key} className="font-semibold">
                              {field.label}
                            </Label>
                            {status?.configured ? (
                              status.fromEnv ? (
                                <Badge variant="secondary">
                                  Défini par la configuration technique
                                </Badge>
                              ) : (
                                <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                                  <ShieldCheck className="h-3 w-3" />
                                  Configuré
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline">Non renseigné</Badge>
                            )}
                          </div>

                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {field.help}
                          </p>

                          {field.options ? (
                            <select
                              id={field.key}
                              value={draft ?? status?.display ?? ""}
                              onChange={(e) =>
                                setDrafts((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#F2B33D]/40"
                            >
                              {field.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={field.key}
                              type={field.secret ? "password" : "text"}
                              autoComplete="off"
                              spellCheck={false}
                              value={draft ?? (field.secret ? "" : status?.display || "")}
                              placeholder={
                                field.secret && status?.configured
                                  ? `Actuellement ${status.display} — saisissez une nouvelle valeur pour la remplacer`
                                  : field.placeholder || ""
                              }
                              onChange={(e) =>
                                setDrafts((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="font-mono text-sm"
                            />
                          )}

                          {status?.fromEnv && (
                            <p className="text-xs text-muted-foreground">
                              Cette valeur vient aujourd’hui de la configuration technique
                              du serveur. En saisir une ici la remplacera.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div className="sticky bottom-4 flex justify-end">
            <Button
              onClick={save}
              disabled={saving || !dirty}
              className="bg-[#F2B33D] text-[#0F0F0F] shadow-lg hover:bg-[#E4A82F]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
