"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Loader2, Plus, Trash2, Upload, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";

export interface StudyRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  file_path: string | null;
  is_active: boolean;
  eyebrow: string | null;
  description: string | null;
  cta_label: string | null;
  cover_url: string | null;
  benefits_title: string | null;
  final_cta_text: string | null;
  meta_description: string | null;
  slides: Array<{ src: string; alt: string }> | null;
  benefits: string[] | null;
  faq: Array<{ question: string; answer: string }> | null;
}

interface Props {
  study: StudyRow;
  onSaved: () => void;
  onDeleted: () => void;
}

/** Éditeur de contenu d'une étude — tout ce que la landing affiche. */
export function StudyEditor({ study, onSaved, onDeleted }: Props) {
  const [draft, setDraft] = useState<StudyRow>({ ...study });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof StudyRow>(key: K, value: StudyRow[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (saving) return;
    if (!draft.title.trim() || !draft.slug.trim()) {
      toast.error("Le titre et l'identifiant d'URL sont obligatoires");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/studies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          slug: draft.slug,
          title: draft.title,
          subtitle: draft.subtitle,
          isActive: draft.is_active,
          eyebrow: draft.eyebrow,
          description: draft.description,
          ctaLabel: draft.cta_label,
          coverUrl: draft.cover_url,
          benefitsTitle: draft.benefits_title,
          finalCtaText: draft.final_cta_text,
          metaDescription: draft.meta_description,
          slides: draft.slides || [],
          benefits: draft.benefits || [],
          faq: draft.faq || [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Enregistrement échoué");
        return;
      }
      toast.success("Étude enregistrée — la page publique est à jour");
      onSaved();
    } catch {
      toast.error("Erreur réseau — rien n'a été enregistré");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Upload du PDF directement vers Supabase Storage via une URL signée.
   * Le fichier ne passe pas par l'API : Vercel plafonne le corps de requête
   * à ~4,5 Mo, ce qu'une étude dépasse largement.
   */
  const uploadPdf = async (file: File) => {
    if (uploading) return;
    if (file.type !== "application/pdf") {
      toast.error("Seul le format PDF est accepté");
      return;
    }

    setUploading(true);
    try {
      const prep = await fetch("/api/admin/studies/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: draft.slug,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      const prepData = await prep.json().catch(() => ({}));
      if (!prep.ok) {
        toast.error(prepData.error || "Préparation de l'upload échouée");
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(prepData.bucket)
        .uploadToSignedUrl(prepData.path, prepData.token, file);

      if (uploadError) {
        toast.error(`Upload échoué : ${uploadError.message}`);
        return;
      }

      // Le chemin n'est enregistré qu'après un upload réussi : sinon on
      // pointerait vers un fichier inexistant et les emails partiraient avec
      // un lien mort.
      const res = await fetch("/api/admin/studies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id, filePath: prepData.path }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Fichier envoyé mais non associé à l'étude");
        return;
      }

      set("file_path", prepData.path);
      toast.success("PDF en ligne — le téléchargement est activé");
      onSaved();
    } catch {
      toast.error("Erreur réseau pendant l'upload");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        `Supprimer « ${study.title} » ? Les leads collectés pour cette étude seront supprimés avec elle. Action irréversible.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/studies?id=${study.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Suppression impossible");
        return;
      }
      toast.success("Étude supprimée");
      onDeleted();
    } catch {
      toast.error("Erreur réseau");
    }
  };

  return (
    <div className="space-y-6">
      {/* ---- Publication ---- */}
      <section className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Publication</h3>
          <div className="flex items-center gap-3">
            <Label htmlFor="study-active" className="cursor-pointer text-sm">
              Page en ligne
            </Label>
            <Switch
              id="study-active"
              checked={draft.is_active}
              onCheckedChange={(v) => set("is_active", v)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Identifiant d&apos;URL *</Label>
            <Input
              value={draft.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="finance"
            />
            <p className="text-xs text-muted-foreground">
              Adresse : /etudes/{draft.slug || "…"}
            </p>
          </div>
          <div className="flex items-end">
            <Button variant="outline" asChild className="w-full">
              <a href={`/etudes/${draft.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Voir la page publique
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ---- Fichier ---- */}
      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="font-semibold">Fichier de l&apos;étude (PDF)</h3>
        {draft.file_path ? (
          <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <FileText className="h-4 w-4 shrink-0" />
            En ligne — le lien de téléchargement part dans les emails.
            <span className="break-all font-mono text-xs opacity-70">{draft.file_path}</span>
          </p>
        ) : (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Aucun fichier. Les demandes sont enregistrées et l&apos;email annonce un envoi à
            venir — la campagne peut démarrer sans le PDF.
          </p>
        )}

        <div className="flex items-center gap-3">
          <input
            id="study-pdf"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPdf(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" disabled={uploading} asChild={!uploading}>
            {uploading ? (
              <span className="inline-flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours…
              </span>
            ) : (
              <label htmlFor="study-pdf" className="cursor-pointer">
                <Upload className="mr-1.5 inline h-4 w-4" />
                {draft.file_path ? "Remplacer le PDF" : "Envoyer le PDF"}
              </label>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">PDF, 100 Mo maximum.</span>
        </div>
      </section>

      {/* ---- Textes ---- */}
      <section className="space-y-4 rounded-lg border border-border p-4">
        <h3 className="font-semibold">Textes de la page</h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Sur-titre</Label>
            <Input value={draft.eyebrow || ""} onChange={(e) => set("eyebrow", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Titre *</Label>
            <Input value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Sous-titre</Label>
            <Input
              value={draft.subtitle || ""}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="Tome 1 : Finance"
            />
          </div>
          <div className="space-y-2">
            <Label>Libellé des boutons</Label>
            <Input
              value={draft.cta_label || ""}
              onChange={(e) => set("cta_label", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description (sous le titre)</Label>
          <Textarea
            rows={3}
            value={draft.description || ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Texte du rappel final</Label>
          <Textarea
            rows={2}
            value={draft.final_cta_text || ""}
            onChange={(e) => set("final_cta_text", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Description pour les moteurs de recherche</Label>
          <Textarea
            rows={2}
            value={draft.meta_description || ""}
            onChange={(e) => set("meta_description", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Affichée dans les résultats Google et les aperçus de partage. Environ 155 caractères.
          </p>
        </div>
      </section>

      {/* ---- Visuels ---- */}
      <section className="space-y-4 rounded-lg border border-border p-4">
        <h3 className="font-semibold">Visuels</h3>

        <ImageUpload
          preset="studyCover"
          label="Couverture (mockup livre)"
          value={draft.cover_url || ""}
          onChange={(url) => set("cover_url", url)}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Pages du carrousel</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => set("slides", [...(draft.slides || []), { src: "", alt: "" }])}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter une page
            </Button>
          </div>

          {(draft.slides || []).map((slide, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Page {i + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    set(
                      "slides",
                      (draft.slides || []).filter((_, index) => index !== i)
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ImageUpload
                preset="studyCover"
                value={slide.src}
                onChange={(url) =>
                  set(
                    "slides",
                    (draft.slides || []).map((s, index) =>
                      index === i ? { ...s, src: url } : s
                    )
                  )
                }
              />
              <Input
                value={slide.alt}
                placeholder="Description de l'image (accessibilité)"
                onChange={(e) =>
                  set(
                    "slides",
                    (draft.slides || []).map((s, index) =>
                      index === i ? { ...s, alt: e.target.value } : s
                    )
                  )
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* ---- Bénéfices ---- */}
      <section className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Bénéfices</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => set("benefits", [...(draft.benefits || []), ""])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Titre du bloc</Label>
          <Input
            value={draft.benefits_title || ""}
            onChange={(e) => set("benefits_title", e.target.value)}
          />
        </div>

        {(draft.benefits || []).map((benefit, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={benefit}
              onChange={(e) =>
                set(
                  "benefits",
                  (draft.benefits || []).map((b, index) => (index === i ? e.target.value : b))
                )
              }
            />
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() =>
                set(
                  "benefits",
                  (draft.benefits || []).filter((_, index) => index !== i)
                )
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </section>

      {/* ---- FAQ ---- */}
      <section className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">FAQ</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => set("faq", [...(draft.faq || []), { question: "", answer: "" }])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        {(draft.faq || []).map((item, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-start gap-2">
              <Input
                value={item.question}
                placeholder="Question"
                onChange={(e) =>
                  set(
                    "faq",
                    (draft.faq || []).map((f, index) =>
                      index === i ? { ...f, question: e.target.value } : f
                    )
                  )
                }
              />
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() =>
                  set(
                    "faq",
                    (draft.faq || []).filter((_, index) => index !== i)
                  )
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              rows={2}
              value={item.answer}
              placeholder="Réponse"
              onChange={(e) =>
                set(
                  "faq",
                  (draft.faq || []).map((f, index) =>
                    index === i ? { ...f, answer: e.target.value } : f
                  )
                )
              }
            />
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={remove}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Supprimer cette étude
        </Button>
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            "Enregistrer les modifications"
          )}
        </Button>
      </div>
    </div>
  );
}
