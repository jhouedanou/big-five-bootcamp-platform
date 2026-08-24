"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getGoogleDriveImageUrl } from "@/lib/utils";

interface LibraryItem {
  id: string;
  title: string;
  brand?: string | null;
  category?: string | null;
  thumbnail?: string | null;
  platforms?: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé avec la campagne choisie ; la fenêtre se ferme ensuite. */
  onSelect: (item: LibraryItem) => void;
}

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Sélecteur de créa dans la bibliothèque Laveiye pour le studio publicitaire.
 *
 * Le studio n'acceptait qu'un fichier du bureau : l'équipe a demandé en recette
 * de pouvoir partir d'une campagne déjà présente dans la bibliothèque. On
 * réutilise `GET /api/contents`, qui applique déjà les règles d'accès du
 * visiteur — inutile d'ouvrir une seconde porte sur les campagnes.
 *
 * Seules les campagnes qui ont un visuel sont proposées : une carte sans image
 * ne peut pas servir de référence.
 */
export function LibraryPickerDialog({ open, onOpenChange, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Évite qu'une réponse lente d'une recherche précédente n'écrase la courante.
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (term: string) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", limit: String(PAGE_SIZE) });
      if (term) params.set("search", term);
      const res = await fetch(`/api/contents?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (requestId !== requestRef.current) return;
      if (!res.ok) {
        setError(data.error || "Chargement impossible.");
        setItems([]);
        return;
      }
      setItems(((data.contents || []) as LibraryItem[]).filter((c) => !!c.thumbnail));
    } catch {
      if (requestId !== requestRef.current) return;
      setError("Erreur réseau. Réessayez.");
      setItems([]);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load(debounced);
  }, [open, debounced, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Choisir dans la bibliothèque Laveiye</DialogTitle>
          <DialogDescription>
            La campagne choisie devient votre création de référence.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une marque, un titre…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="min-h-[220px] flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement…
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune campagne avec visuel ne correspond à cette recherche.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onOpenChange(false);
                    }}
                    className="group w-full overflow-hidden rounded-lg border border-border text-left transition hover:border-[#F2B33D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B33D]"
                  >
                    <div className="relative aspect-square bg-muted">
                      <Image
                        src={getGoogleDriveImageUrl(item.thumbnail || "") || "/placeholder.svg"}
                        alt={item.title}
                        fill
                        sizes="200px"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-semibold">{item.title}</p>
                      {item.brand && (
                        <p className="truncate text-[11px] text-muted-foreground">{item.brand}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { LibraryItem };
