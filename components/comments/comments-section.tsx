"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, MessageSquare, Pencil, Trash2, Flag, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_LENGTH = 1500;
const PAGE_SIZE = 20;

interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  isOfficial: boolean;
  isPinned: boolean;
  author: CommentAuthor;
  isMine: boolean;
}

interface CommentsSectionProps {
  campaignId: string;
  className?: string;
}

export function CommentsSection({ campaignId, className }: CommentsSectionProps) {
  const { session } = useAuthContext();
  const token = session?.access_token || null;

  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const authHeaders = useCallback(
    (json = false): Record<string, string> => {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (json) headers["Content-Type"] = "application/json";
      return headers;
    },
    [token]
  );

  // Chargement initial (et rechargement si l'utilisateur se connecte).
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/comments?campaignId=${encodeURIComponent(campaignId)}&limit=${PAGE_SIZE}`,
          { headers: authHeaders() }
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setComments(data.comments || []);
        setTotal(data.total || 0);
        setHasMore(!!data.hasMore);
      } catch {
        if (!cancelled) toast.error("Impossible de charger les commentaires");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, token, authHeaders]);

  const loadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/comments?campaignId=${encodeURIComponent(campaignId)}&offset=${comments.length}&limit=${PAGE_SIZE}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setComments((prev) => [...prev, ...(data.comments || [])]);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch {
      toast.error("Impossible de charger la suite");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handlePost = async () => {
    const body = draft.trim();
    if (!body || isPosting) return;

    setIsPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ campaignId, body }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la publication");
        return;
      }

      // Les commentaires épinglés restent en tête : on insère après eux.
      setComments((prev) => {
        const pinnedCount = prev.findIndex((c) => !c.isPinned);
        const at = pinnedCount === -1 ? prev.length : pinnedCount;
        return [...prev.slice(0, at), data.comment, ...prev.slice(at)];
      });
      setTotal((t) => t + 1);
      setDraft("");
      toast.success("Commentaire publié");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    const body = editDraft.trim();
    if (!body || busyId) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la modification");
        return;
      }

      setComments((prev) => prev.map((c) => (c.id === id ? data.comment : c)));
      setEditingId(null);
      setEditDraft("");
      toast.success("Commentaire modifié");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (busyId) return;
    if (!window.confirm("Supprimer définitivement ce commentaire ?")) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la suppression");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success("Commentaire supprimé");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const handleReport = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/comments/${id}/report`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors du signalement");
        return;
      }
      toast.success("Commentaire signalé. Merci, notre équipe va le relire.");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  // Visiteur non connecté : la section reste visible mais en lecture seule.
  if (!token) {
    return (
      <Card className={cn("border-l-4 border-l-[#F2B33D] shadow-sm", className)}>
        <CardContent className="p-6">
          <SectionTitle count={null} />
          <p className="mt-3 text-sm text-muted-foreground">
            Connectez-vous pour lire et publier des commentaires sur cette campagne.
          </p>
        </CardContent>
      </Card>
    );
  }

  const remaining = MAX_LENGTH - draft.length;

  return (
    <Card
      id="campaign-comments"
      className={cn("scroll-mt-24 border-l-4 border-l-[#F2B33D] shadow-sm", className)}
    >
      <CardContent className="space-y-6 p-6">
        <SectionTitle count={total} />

        {/* Formulaire de publication */}
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Partagez votre analyse ou votre retour sur cette campagne…"
            rows={3}
            className="resize-y"
            aria-label="Votre commentaire"
          />
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                "text-xs",
                remaining < 100 ? "text-amber-600" : "text-muted-foreground"
              )}
            >
              {remaining} caractères restants
            </span>
            <Button
              onClick={handlePost}
              disabled={!draft.trim() || isPosting}
              className="bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]"
            >
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publication…
                </>
              ) : (
                "Publier"
              )}
            </Button>
          </div>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement des commentaires…
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun commentaire pour le moment. Soyez le premier à réagir.
          </p>
        ) : (
          <ul className="space-y-5">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className={cn(
                  "flex gap-3",
                  comment.isOfficial && "rounded-lg bg-[#FFF6E3] p-3 dark:bg-[#F2B33D]/10"
                )}
              >
                <Avatar author={comment.author} />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold">{comment.author.name}</span>
                    {comment.isOfficial && (
                      <Badge className="bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#F2B33D]">
                        Réponse officielle
                      </Badge>
                    )}
                    {comment.isPinned && (
                      <Badge variant="secondary">Épinglé</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(comment.createdAt)}
                      {comment.editedAt && " · modifié"}
                    </span>
                  </div>

                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value.slice(0, MAX_LENGTH))}
                        rows={3}
                        className="resize-y"
                        aria-label="Modifier le commentaire"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={!editDraft.trim() || busyId === comment.id}
                          className="bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Enregistrer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft("");
                          }}
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Texte brut : React échappe le contenu, pas de dangerouslySetInnerHTML ici. */}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                        {comment.body}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {comment.isMine ? (
                          <>
                            <ActionButton
                              icon={Pencil}
                              label="Modifier"
                              onClick={() => {
                                setEditingId(comment.id);
                                setEditDraft(comment.body);
                              }}
                              disabled={busyId === comment.id}
                            />
                            <ActionButton
                              icon={Trash2}
                              label="Supprimer"
                              onClick={() => handleDelete(comment.id)}
                              disabled={busyId === comment.id}
                            />
                          </>
                        ) : (
                          <ActionButton
                            icon={Flag}
                            label="Signaler"
                            onClick={() => handleReport(comment.id)}
                            disabled={busyId === comment.id}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement…
                </>
              ) : (
                "Charger plus de commentaires"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ count }: { count: number | null }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold">
      <MessageSquare className="h-5 w-5 text-[#F2B33D]" />
      Commentaires
      {count !== null && count > 0 && (
        <span className="text-sm font-normal text-muted-foreground">({count})</span>
      )}
    </h2>
  );
}

function Avatar({ author }: { author: CommentAuthor }) {
  if (author.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars externes (OAuth), domaines non listés dans next.config
      <img
        src={author.avatarUrl}
        alt=""
        className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground"
    >
      {initials(author.name)}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
}
