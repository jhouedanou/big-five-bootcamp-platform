"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { useRequireActiveSubscription } from "@/hooks/use-require-active-subscription";
import { toast } from "sonner";

const REQUIRED = [
  { key: "secteur", label: "Secteur", placeholder: "Banque, télécoms, FMCG…" },
  { key: "produit", label: "Produit", placeholder: "Compte épargne, forfait data…" },
  { key: "cible", label: "Cible", placeholder: "Jeunes actifs urbains 25-35 ans" },
  { key: "canal", label: "Canal", placeholder: "Instagram, Facebook, affichage…" },
  { key: "ton", label: "Ton", placeholder: "Complice, institutionnel, humoristique…" },
  { key: "emotion", label: "Émotion", placeholder: "Fierté, soulagement, urgence…" },
  { key: "objectif", label: "Objectif", placeholder: "Acquisition, notoriété, adoption…" },
] as const;

const OPTIONAL = [
  { key: "promesse", label: "Promesse", placeholder: "Ce que la marque garantit" },
  { key: "marque", label: "Marque", placeholder: "Laissez vide pour ne pas l'afficher" },
  { key: "texte", label: "Texte à intégrer", placeholder: "Accroche à faire figurer" },
  { key: "contraintes", label: "Contraintes", placeholder: "Mentions légales, interdits…" },
  { key: "format", label: "Format", placeholder: "1:1, 4:5, 9:16" },
  { key: "charte", label: "Charte graphique", placeholder: "Couleurs, typographies" },
] as const;

interface Result {
  imageUrl: string | null;
  analysis: string | null;
  framework: string | null;
  remaining?: number;
}

export default function StudioPubPage() {
  return (
    <Suspense fallback={null}>
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  // Le hook redirige lui-même un utilisateur sans abonnement actif ; on attend
  // simplement la fin de sa vérification avant d'afficher quoi que ce soit.
  const { checking: checkingSubscription } = useRequireActiveSubscription();
  const searchParams = useSearchParams();

  const [brief, setBrief] = useState<Record<string, string>>({});
  const [referencePath, setReferencePath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Arrivée depuis une fiche campagne : on pré-remplit ce qu'on connaît déjà,
  // l'utilisateur n'a plus qu'à décrire son propre projet.
  useEffect(() => {
    const seed: Record<string, string> = {};
    const secteur = searchParams.get("secteur");
    const marque = searchParams.get("marque");
    const canal = searchParams.get("canal");
    if (secteur) seed.secteur = secteur;
    if (canal) seed.canal = canal;
    if (marque) seed.marque = "";
    if (Object.keys(seed).length) setBrief((prev) => ({ ...seed, ...prev }));
  }, [searchParams]);

  const set = (key: string, value: string) =>
    setBrief((prev) => ({ ...prev, [key]: value }));

  const uploadReference = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/studio/reference", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "L'envoi de l'image a échoué.");
        return;
      }
      setReferencePath(data.path);
      setPreviewUrl(data.previewUrl);
    } catch {
      setError("Erreur réseau pendant l'envoi de l'image.");
    } finally {
      setUploading(false);
    }
  };

  const generate = async () => {
    if (generating) return;

    // Vérification de complétude côté formulaire : les champs sont connus
    // d'avance, inutile de faire un aller-retour serveur pour l'apprendre.
    const missingLabels = REQUIRED.filter((f) => !String(brief[f.key] || "").trim()).map(
      (f) => f.label
    );
    setMissing(missingLabels);
    setError(null);

    if (!referencePath) {
      setError("Ajoutez une création de référence avant de lancer la génération.");
      return;
    }
    if (missingLabels.length > 0) return;

    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referencePath, brief }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.missing?.length) setMissing(data.missing);
        setError(data.error || "La génération a échoué.");
        return;
      }

      setResult({
        imageUrl: data.imageUrl,
        analysis: data.analysis,
        framework: data.framework,
        remaining: data.remaining,
      });
      toast.success("Création générée");
    } catch {
      setError("Erreur réseau pendant la génération.");
    } finally {
      setGenerating(false);
    }
  };

  if (checkingSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <Wand2 className="h-7 w-7 text-[#F2B33D]" />
            Studio publicitaire
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Partez d&apos;une création qui vous inspire et décrivez votre projet. La création
            de référence est analysée, puis sa logique — accroche, émotion, structure du
            message — est transposée à votre secteur. Le visuel d&apos;origine n&apos;est
            jamais copié.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* ---------------- Formulaire ---------------- */}
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-3 p-5">
                <Label className="text-base font-semibold">Création de référence</Label>
                <p className="text-sm text-muted-foreground">
                  Une publicité existante dont vous voulez reprendre la mécanique.
                  PNG, JPEG ou WebP, 8 Mo maximum.
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadReference(file);
                    e.target.value = "";
                  }}
                />

                {previewUrl ? (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                    <img
                      src={previewUrl}
                      alt="Création de référence"
                      className="max-h-64 rounded-lg border border-border object-contain"
                    />
                    <button
                      type="button"
                      aria-label="Retirer l'image"
                      onClick={() => {
                        setReferencePath(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-background shadow-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi…
                      </>
                    ) : (
                      <>
                        <ImagePlus className="mr-1.5 h-4 w-4" />
                        Choisir une image
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <Label className="text-base font-semibold">Votre projet</Label>
                  <p className="text-sm text-muted-foreground">Tous ces champs sont nécessaires.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {REQUIRED.map((field) => {
                    const isMissing = missing.includes(field.label);
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={field.key}>
                          {field.label}
                          <span className="ml-0.5 text-[#F2B33D]">*</span>
                        </Label>
                        <Input
                          id={field.key}
                          value={brief[field.key] || ""}
                          placeholder={field.placeholder}
                          onChange={(e) => set(field.key, e.target.value)}
                          className={isMissing ? "border-destructive" : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <Label className="text-base font-semibold">Précisions (facultatif)</Label>
                  <p className="text-sm text-muted-foreground">
                    Plus vous en dites, plus le résultat colle à votre intention.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {OPTIONAL.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.key === "contraintes" ? (
                        <Textarea
                          id={field.key}
                          rows={2}
                          value={brief[field.key] || ""}
                          placeholder={field.placeholder}
                          onChange={(e) => set(field.key, e.target.value)}
                        />
                      ) : (
                        <Input
                          id={field.key}
                          value={brief[field.key] || ""}
                          placeholder={field.placeholder}
                          onChange={(e) => set(field.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {missing.length > 0 && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
              >
                <p className="mb-1 font-semibold text-destructive">
                  Il manque {missing.length === 1 ? "un élément" : "des éléments"} :
                </p>
                <p className="text-muted-foreground">{missing.join(" · ")}</p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-muted-foreground">{error}</p>
              </div>
            )}

            <Button
              size="lg"
              onClick={generate}
              disabled={generating || uploading}
              className="w-full bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F] sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyse et génération en cours…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Générer la création
                </>
              )}
            </Button>
          </div>

          {/* ---------------- Résultat ---------------- */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {generating && (
              <Card>
                <CardContent className="space-y-3 p-6 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#F2B33D]" />
                  <p className="font-semibold">Analyse et génération en cours…</p>
                  <p className="text-sm text-muted-foreground">
                    Comptez une minute environ. Ne fermez pas cette page.
                  </p>
                </CardContent>
              </Card>
            )}

            {result && !generating && (
              <>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    {result.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                        <img
                          src={result.imageUrl}
                          alt="Création générée"
                          className="w-full rounded-lg border border-border"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm">
                            <a href={result.imageUrl} download target="_blank" rel="noopener noreferrer">
                              <Download className="mr-1.5 h-4 w-4" />
                              Télécharger
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" onClick={generate}>
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Relancer
                          </Button>
                        </div>
                        {typeof result.remaining === "number" && (
                          <p className="text-xs text-muted-foreground">
                            {result.remaining} génération{result.remaining > 1 ? "s" : ""} restante
                            {result.remaining > 1 ? "s" : ""} aujourd&apos;hui.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune image n&apos;a été retournée.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {(result.analysis || result.framework) && (
                  <Card>
                    <CardContent className="space-y-3 p-4 text-sm">
                      <p className="font-semibold">Ce qui a servi de base</p>
                      {result.analysis && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Analyse de la référence
                          </p>
                          <p className="text-muted-foreground">{result.analysis}</p>
                        </div>
                      )}
                      {result.framework && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Mécanique transposée
                          </p>
                          <p className="text-muted-foreground">{result.framework}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!generating && !result && (
              <Card className="border-dashed">
                <CardContent className="space-y-2 p-6 text-center text-sm text-muted-foreground">
                  <Sparkles className="mx-auto h-7 w-7 text-[#F2B33D]/60" />
                  <p>La création générée apparaîtra ici, avec l&apos;analyse qui l&apos;a inspirée.</p>
                  <p className="text-xs">
                    Besoin d&apos;inspiration ?{" "}
                    <Link href="/dashboard" className="underline hover:text-foreground">
                      Parcourez la bibliothèque
                    </Link>
                    .
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
