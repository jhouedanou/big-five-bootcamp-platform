"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StudyEditor, type StudyRow } from "./study-editor";

interface Lead {
  id: string;
  study_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  /** Ajoutés par la migration #18 : absents des leads antérieurs. */
  country: string | null;
  sector: string | null;
  company: string | null;
  job_title: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  downloaded_at: string | null;
  created_at: string;
}

interface Stats {
  leads: number;
  downloads: number;
  pageViews: number | null;
  formOpens: number | null;
  conversionRate: number | null;
  bySource: Array<{ source: string; leads: number }>;
}

type Tab = "contenu" | "leads";

export default function AdminStudiesPage() {
  const [tab, setTab] = useState<Tab>("contenu");
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingStudies, setLoadingStudies] = useState(true);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [filters, setFilters] = useState({ studyId: "", source: "", from: "", to: "" });

  const loadStudies = useCallback(async () => {
    setLoadingStudies(true);
    try {
      const res = await fetch("/api/admin/studies");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Chargement impossible");
        setStudies([]);
        return;
      }
      const list: StudyRow[] = data.studies || [];
      setStudies(list);
      setSelectedId((current) =>
        current && list.some((s) => s.id === current) ? current : (list[0]?.id ?? null)
      );
    } catch {
      toast.error("Erreur réseau");
      setStudies([]);
    } finally {
      setLoadingStudies(false);
    }
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.studyId) params.set("studyId", filters.studyId);
    if (filters.source) params.set("source", filters.source);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    return params.toString();
  }, [filters]);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch(`/api/admin/studies/leads?${queryString}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Chargement des leads impossible");
        setLeads([]);
        setStats(null);
        return;
      }
      setLeads(data.leads || []);
      setStats(data.stats || null);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoadingLeads(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadStudies();
  }, [loadStudies]);

  useEffect(() => {
    if (tab === "leads") loadLeads();
  }, [tab, loadLeads]);

  const createStudy = async () => {
    const title = window.prompt("Titre de la nouvelle étude ?");
    if (!title?.trim()) return;
    const slug = window.prompt(
      "Identifiant d'URL ? (adresse : /etudes/<identifiant>)",
      title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
    );
    if (!slug?.trim()) return;

    try {
      const res = await fetch("/api/admin/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, isActive: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Création impossible");
        return;
      }
      toast.success("Étude créée — complétez son contenu puis mettez-la en ligne");
      await loadStudies();
      setSelectedId(data.study?.id ?? null);
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const selected = studies.find((s) => s.id === selectedId) || null;
  const sources = stats?.bySource.map((s) => s.source) ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6 text-[#F2B33D]" />
            Études
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Contenu des pages de téléchargement, fichier PDF et contacts collectés.
            Toute modification est visible sur le site sans déploiement.
          </p>
        </div>
        {tab === "contenu" && (
          <Button onClick={createStudy} className="bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]">
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvelle étude
          </Button>
        )}
      </header>

      <div className="flex gap-2">
        {(
          [
            { key: "contenu", label: "Contenu & PDF", icon: BookOpen },
            { key: "leads", label: "Contacts collectés", icon: Users },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(key)}
            className={cn(tab === key && "bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]")}
          >
            <Icon className="mr-1.5 h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {tab === "contenu" ? (
        loadingStudies ? (
          <Loading />
        ) : studies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Aucune étude. Créez-en une, ou exécutez la migration 12 si vous attendiez
              le Tome 1.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <nav className="space-y-1">
              {studies.map((study) => (
                <button
                  key={study.id}
                  type="button"
                  onClick={() => setSelectedId(study.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    study.id === selectedId
                      ? "border-[#F2B33D] bg-[#F2B33D]/10 font-semibold"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <span className="block truncate">{study.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    {study.is_active ? (
                      <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">
                        En ligne
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Hors ligne
                      </Badge>
                    )}
                    {!study.file_path && (
                      <Badge variant="secondary" className="text-[10px]">
                        Sans PDF
                      </Badge>
                    )}
                  </span>
                </button>
              ))}
            </nav>

            {selected && (
              <StudyEditor
                key={selected.id}
                study={selected}
                onSaved={loadStudies}
                onDeleted={() => {
                  setSelectedId(null);
                  loadStudies();
                }}
              />
            )}
          </div>
        )
      ) : (
        <div className="space-y-6">
          {/* ---- Filtres ---- */}
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Étude</Label>
                <Select
                  value={filters.studyId || "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, studyId: v === "all" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {studies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Source</Label>
                <Select
                  value={filters.source || "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, source: v === "all" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {sources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Du</Label>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Au</Label>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    window.open(`/api/admin/studies/export?${queryString}`, "_blank")
                  }
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Exporter en CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ---- KPI ---- */}
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi
                label="Visites"
                value={stats.pageViews}
                hint="Approximatif : les bloqueurs de publicité empêchent une partie du comptage."
              />
              <Kpi label="Formulaires ouverts" value={stats.formOpens} />
              <Kpi label="Contacts collectés" value={stats.leads} highlight />
              <Kpi label="Téléchargements" value={stats.downloads} />
              <Kpi
                label="Taux de conversion"
                value={
                  stats.conversionRate == null
                    ? null
                    : `${(stats.conversionRate * 100).toFixed(1)} %`
                }
                hint="Contacts collectés rapportés aux visites."
              />
            </div>
          )}

          {stats && stats.bySource.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">Répartition par source</h3>
                <ul className="space-y-2">
                  {stats.bySource.map(({ source, leads: count }) => (
                    <li key={source} className="flex items-center gap-3 text-sm">
                      <span className="w-32 shrink-0 truncate font-medium">{source}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[#F2B33D]"
                          style={{
                            width: `${stats.leads ? (count / stats.leads) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* ---- Table ---- */}
          {loadingLeads ? (
            <Loading />
          ) : leads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Aucun contact pour ces filtres.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left">
                    <tr>
                      {/* Les neuf champs listés au brief bannière (§7 « Détail des
                          contacts ») : nom, email, téléphone, entreprise, fonction
                          (sous le nom), source, campagne, date et étude. */}
                      {["Date", "Nom", "Email", "Téléphone", "Pays", "Secteur", "Entreprise", "Étude", "Source", "Campagne", "PDF"].map(
                        (h) => (
                          <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/60 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          {lead.first_name} {lead.last_name}
                          {lead.job_title && (
                            <span className="block text-xs text-muted-foreground">
                              {lead.job_title}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{lead.email}</td>
                        <td className="whitespace-nowrap px-4 py-3">{lead.phone}</td>
                        <td className="whitespace-nowrap px-4 py-3">{lead.country || "—"}</td>
                        <td className="px-4 py-3">{lead.sector || "—"}</td>
                        <td className="px-4 py-3">{lead.company || "—"}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">
                          {studies.find((s) => s.id === lead.study_id)?.title || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{lead.utm_source || "direct"}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {lead.utm_campaign || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {lead.downloaded_at ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">Oui</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Chargement…
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: number | string | null;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-[#F2B33D]")}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {value == null ? <span className="text-base text-muted-foreground">—</span> : value}
        </p>
        {hint && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
