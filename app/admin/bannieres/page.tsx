"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, Plus, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildBannerUrl,
  isBannerLive,
  type DashboardBanner,
} from "@/lib/dashboard-banners";
import { toast } from "sonner";

type Draft = Omit<DashboardBanner, "id" | "createdAt" | "updatedAt"> & { id?: string };

const EMPTY: Draft = {
  title: "",
  body: "",
  ctaLabel: "Télécharger l'étude",
  imageUrl: "",
  displayMode: "editorial",
  linkUrl: "/etudes/finance",
  utmSource: "laveiye",
  utmMedium: "banner",
  utmCampaign: "etude_big_five",
  utmContent: "banniere_telechargement",
  startsAt: null,
  endsAt: null,
  isActive: false,
  sortOrder: 0,
};

/** `datetime-local` attend "YYYY-MM-DDTHH:mm" en heure locale, pas de l'ISO UTC. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<DashboardBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Mode « Visuel complet » : le visuel porte sa propre mise en page, les champs
  // de texte du formulaire ne sont donc pas affichés sur le dashboard.
  const isFullImage = draft?.displayMode === "image";

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Chargement impossible");
        setBanners([]);
        return;
      }
      setBanners(data.banners || []);
    } catch {
      toast.error("Erreur réseau");
      setBanners([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft || saving) return;
    if (!draft.title.trim() || !draft.linkUrl.trim()) {
      toast.error("Le titre et le lien de destination sont obligatoires");
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!draft.id;
      const res = await fetch("/api/admin/banners", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Enregistrement échoué");
        return; // dialogue laissé ouvert : la saisie n'est pas perdue
      }

      toast.success(isEdit ? "Bannière mise à jour" : "Bannière créée");
      setDraft(null);
      await load();
    } catch {
      toast.error("Erreur réseau — rien n'a été enregistré");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (banner: DashboardBanner) => {
    if (busyId) return;
    setBusyId(banner.id);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: banner.id, isActive: !banner.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Action impossible");
        return;
      }
      toast.success(banner.isActive ? "Bannière désactivée" : "Bannière activée");
      await load();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (banner: DashboardBanner) => {
    if (busyId) return;
    if (!window.confirm(`Supprimer définitivement « ${banner.title} » ?`)) return;

    setBusyId(banner.id);
    try {
      const res = await fetch(`/api/admin/banners?id=${banner.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Suppression impossible");
        return;
      }
      toast.success("Bannière supprimée");
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Megaphone className="h-6 w-6 text-[#F2B33D]" />
            Bannières du dashboard
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Diapositives affichées en tête du dashboard. Textes, visuel, lien, paramètres
            UTM et dates se modifient ici — aucun déploiement nécessaire.
          </p>
        </div>
        <Button
          onClick={() => setDraft({ ...EMPTY })}
          className="bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle bannière
        </Button>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement…
        </div>
      ) : banners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucune bannière. Créez-en une pour l&apos;afficher en tête du dashboard.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {banners.map((banner) => {
            const live = isBannerLive(banner);
            return (
              <li key={banner.id}>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{banner.title}</span>
                      {live ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Diffusée</Badge>
                      ) : banner.isActive ? (
                        <Badge variant="secondary">Active, hors fenêtre de dates</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                      {banner.utmCampaign && (
                        <Badge variant="secondary">{banner.utmCampaign}</Badge>
                      )}
                    </div>

                    {banner.body && (
                      <p className="text-sm text-muted-foreground">{banner.body}</p>
                    )}

                    <p className="break-all text-xs text-muted-foreground">
                      <span className="font-semibold">Destination : </span>
                      {buildBannerUrl(banner, "https://laveiye.com")}
                    </p>

                    {(banner.startsAt || banner.endsAt) && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Diffusion : </span>
                        {banner.startsAt
                          ? new Date(banner.startsAt).toLocaleString("fr-FR")
                          : "immédiate"}
                        {" → "}
                        {banner.endsAt
                          ? new Date(banner.endsAt).toLocaleString("fr-FR")
                          : "sans fin"}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === banner.id}
                        onClick={() => setDraft({ ...banner })}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === banner.id}
                        onClick={() => toggleActive(banner)}
                      >
                        {banner.isActive ? (
                          <>
                            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                            Désactiver
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Activer
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={buildBannerUrl(banner)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Tester le lien
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === banner.id}
                        onClick={() => remove(banner)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Modifier la bannière" : "Nouvelle bannière"}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <fieldset className="space-y-3 rounded-lg border border-border p-4">
                <legend className="px-1 text-sm font-semibold">Mode d&apos;affichage</legend>
                <RadioGroup
                  value={draft.displayMode}
                  onValueChange={(v) =>
                    setDraft({ ...draft, displayMode: v === "image" ? "image" : "editorial" })
                  }
                  className="gap-3"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <RadioGroupItem value="editorial" className="mt-1" />
                    <span className="text-sm">
                      <span className="font-medium">Bannière éditoriale</span>
                      <span className="block text-xs text-muted-foreground">
                        Le titre, le texte et le bouton sont saisis ici. Le visuel les
                        accompagne sur la moitié droite de la carte.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <RadioGroupItem value="image" className="mt-1" />
                    <span className="text-sm">
                      <span className="font-medium">Visuel complet</span>
                      <span className="block text-xs text-muted-foreground">
                        Le visuel occupe toute la carte, sans texte par-dessus. À choisir
                        quand la bannière fournie porte déjà son titre et son bouton.
                      </span>
                    </span>
                  </label>
                </RadioGroup>
              </fieldset>

              <div className="space-y-2">
                <Label>{isFullImage ? "Titre (interne)" : "Titre *"}</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="L'étude Big Five est disponible"
                />
                {isFullImage && (
                  <p className="text-xs text-muted-foreground">
                    Non affiché sur le dashboard en mode « Visuel complet » : sert à
                    retrouver la bannière ici, et de description alternative du visuel.
                  </p>
                )}
              </div>

              {!isFullImage && (
                <div className="space-y-2">
                  <Label>Texte</Label>
                  <Textarea
                    rows={2}
                    value={draft.body || ""}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    placeholder="Téléchargez notre étude pour découvrir…"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {!isFullImage && (
                  <div className="space-y-2">
                    <Label>Libellé du bouton</Label>
                    <Input
                      value={draft.ctaLabel}
                      onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Lien de destination *</Label>
                  <Input
                    value={draft.linkUrl}
                    onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                    placeholder="/etudes/finance"
                  />
                </div>
              </div>

              <ImageUpload
                preset="banner"
                label={isFullImage ? "Visuel de la bannière *" : "Visuel de la bannière"}
                value={draft.imageUrl || ""}
                onChange={(url) => setDraft({ ...draft, imageUrl: url })}
                placeholder="Bannière fournie par l'équipe créative"
                /* En mode « Visuel complet », l'aperçu doit montrer ce que verra
                   l'utilisateur : cadre large et image entière, pas une vignette
                   carrée recadrée qui donne une idée fausse du rendu. */
                previewClassName={isFullImage ? "w-full aspect-[16/5]" : "w-32 h-32"}
                previewFit={isFullImage ? "contain" : "cover"}
              />
              {isFullImage && (
                <p className="text-xs text-muted-foreground">
                  Format conseillé : <strong>1200 × 375 px</strong> (ratio 16/5). Le visuel
                  n&apos;est jamais rogné — un ratio très différent laissera des marges.
                </p>
              )}
              {isFullImage && !draft.imageUrl && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Sans visuel, ce mode n&apos;a rien à afficher : la bannière retombera sur le
                  rendu éditorial.
                </p>
              )}

              <fieldset className="space-y-3 rounded-lg border border-border p-4">
                <legend className="px-1 text-sm font-semibold">Paramètres de campagne</legend>
                <p className="text-xs text-muted-foreground">
                  Ajoutés au lien au moment du clic. Ils permettent de distinguer le trafic
                  venu de cette bannière des autres sources dans le suivi.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <UtmField
                    label="utm_source"
                    value={draft.utmSource}
                    onChange={(v) => setDraft({ ...draft, utmSource: v })}
                  />
                  <UtmField
                    label="utm_medium"
                    value={draft.utmMedium}
                    onChange={(v) => setDraft({ ...draft, utmMedium: v })}
                  />
                  <UtmField
                    label="utm_campaign"
                    value={draft.utmCampaign}
                    onChange={(v) => setDraft({ ...draft, utmCampaign: v })}
                  />
                  <UtmField
                    label="utm_content"
                    value={draft.utmContent}
                    onChange={(v) => setDraft({ ...draft, utmContent: v })}
                  />
                </div>
                <p className="break-all rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                  Aperçu : {buildBannerUrl({ ...(draft as DashboardBanner), id: "preview" }, "https://laveiye.com")}
                </p>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Début de diffusion</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(draft.startsAt)}
                    onChange={(e) =>
                      setDraft({ ...draft, startsAt: fromLocalInput(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Vide = immédiate.</p>
                </div>
                <div className="space-y-2">
                  <Label>Fin de diffusion</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(draft.endsAt)}
                    onChange={(e) =>
                      setDraft({ ...draft, endsAt: fromLocalInput(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Vide = sans fin. Passée cette date, la bannière disparaît seule.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label className="cursor-pointer">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Diffusée si la date le permet.
                    </p>
                  </div>
                  <Switch
                    checked={draft.isActive}
                    onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordre d&apos;affichage</Label>
                  <Input
                    type="number"
                    value={draft.sortOrder}
                    onChange={(e) =>
                      setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Le plus petit passe en premier.</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
              Annuler
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
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UtmField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-xs">{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
