"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Loader2,
  MessageSquare,
  EyeOff,
  Eye,
  Pin,
  PinOff,
  Trash2,
  Flag,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Filter = "reported" | "hidden" | "all";

interface AdminComment {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  isOfficial: boolean;
  isPinned: boolean;
  isHidden: boolean;
  hiddenReason: string | null;
  campaignId: string;
  campaignTitle: string;
  author: { id: string; name: string; avatarUrl: string | null };
  reportCount: number;
  reportReasons: string[];
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "reported", label: "Signalés" },
  { key: "hidden", label: "Masqués" },
  { key: "all", label: "Tous" },
];

export default function AdminCommentsPage() {
  const [filter, setFilter] = useState<Filter>("reported");
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (which: Filter) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/comments?filter=${which}&limit=50`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setComments(data.comments || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Impossible de charger les commentaires");
      setComments([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const moderate = async (
    commentId: string,
    action: "hide" | "unhide" | "pin" | "unpin" | "dismiss_reports",
    successMessage: string
  ) => {
    if (busyId) return;
    setBusyId(commentId);
    try {
      const res = await fetch("/api/admin/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Action impossible");
        return;
      }
      toast.success(successMessage);
      await load(filter);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (commentId: string) => {
    if (busyId) return;
    if (
      !window.confirm(
        "Supprimer définitivement ce commentaire ? Cette action est irréversible — préférez « Masquer » si un doute subsiste."
      )
    ) {
      return;
    }
    setBusyId(commentId);
    try {
      const res = await fetch(`/api/admin/comments?commentId=${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Suppression impossible");
        return;
      }
      toast.success("Commentaire supprimé");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquare className="h-6 w-6 text-[#F2B33D]" />
          Commentaires
        </h1>
        <p className="text-sm text-muted-foreground">
          Modération a posteriori : les commentaires sont publiés immédiatement et
          relus ici. « Masquer » les retire du site sans les détruire.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className={cn(
              filter === f.key && "bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]"
            )}
          >
            {f.label}
          </Button>
        ))}
        {!isLoading && (
          <span className="self-center text-sm text-muted-foreground">
            {total} commentaire{total > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement…
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {filter === "reported"
              ? "Aucun signalement en attente."
              : filter === "hidden"
                ? "Aucun commentaire masqué."
                : "Aucun commentaire pour le moment."}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <Card className={cn(comment.isHidden && "opacity-60")}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-semibold">{comment.author.name}</span>
                    <span className="text-muted-foreground">
                      sur{" "}
                      <Link
                        href={`/content/${comment.campaignId}#campaign-comments`}
                        target="_blank"
                        className="inline-flex items-center gap-1 underline hover:text-[#F2B33D]"
                      >
                        {comment.campaignTitle}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(comment.createdAt)}
                      {comment.editedAt && " · modifié"}
                    </span>

                    {comment.reportCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <Flag className="h-3 w-3" />
                        {comment.reportCount} signalement
                        {comment.reportCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {comment.isOfficial && (
                      <Badge className="bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#F2B33D]">
                        Officiel
                      </Badge>
                    )}
                    {comment.isPinned && <Badge variant="secondary">Épinglé</Badge>}
                    {comment.isHidden && <Badge variant="outline">Masqué</Badge>}
                  </div>

                  <p className="whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
                    {comment.body}
                  </p>

                  {comment.reportReasons.length > 0 && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                      <p className="mb-1 font-semibold text-destructive">
                        Motifs de signalement
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                        {comment.reportReasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {comment.isHidden ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === comment.id}
                        onClick={() =>
                          moderate(comment.id, "unhide", "Commentaire réaffiché")
                        }
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Réafficher
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === comment.id}
                        onClick={() => moderate(comment.id, "hide", "Commentaire masqué")}
                      >
                        <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                        Masquer
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === comment.id}
                      onClick={() =>
                        comment.isPinned
                          ? moderate(comment.id, "unpin", "Commentaire désépinglé")
                          : moderate(comment.id, "pin", "Commentaire épinglé")
                      }
                    >
                      {comment.isPinned ? (
                        <>
                          <PinOff className="mr-1.5 h-3.5 w-3.5" />
                          Désépingler
                        </>
                      ) : (
                        <>
                          <Pin className="mr-1.5 h-3.5 w-3.5" />
                          Épingler
                        </>
                      )}
                    </Button>

                    {comment.reportCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === comment.id}
                        onClick={() =>
                          moderate(
                            comment.id,
                            "dismiss_reports",
                            "Signalements classés sans suite"
                          )
                        }
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Classer sans suite
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === comment.id}
                      onClick={() => remove(comment.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
}
