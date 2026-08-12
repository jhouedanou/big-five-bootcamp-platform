"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Check,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { useRequireActiveSubscription } from "@/hooks/use-require-active-subscription";
import { cn } from "@/lib/utils";

/**
 * Studio publicitaire — parcours conversationnel.
 *
 * L'utilisateur est guidé question par question, façon messagerie : une seule
 * chose à faire à chaque instant, des suggestions cliquables pour aller vite,
 * et la génération part toute seule à la fin. Le back-end reste inchangé
 * (une soumission unique vers /api/studio/generate) : la conversation est
 * purement une couche de guidage côté client.
 */

interface FieldStep {
  key: string;
  question: string;
  placeholder: string;
  /** Réponses rapides cliquables ; la saisie libre reste toujours possible. */
  chips?: string[];
}

const REQUIRED_STEPS: FieldStep[] = [
  {
    key: "secteur",
    question: "Quel est le secteur de votre projet ?",
    placeholder: "Ex. : banque, télécoms, cosmétique…",
    chips: ["Banque / Finance", "Télécoms", "FMCG", "E-commerce", "Tech", "Transport"],
  },
  {
    key: "produit",
    question: "Quel produit ou service voulez-vous mettre en avant ?",
    placeholder: "Ex. : compte épargne rémunéré, forfait data illimité…",
  },
  {
    key: "cible",
    question: "À qui s'adresse cette publicité ?",
    placeholder: "Ex. : jeunes actifs urbains 25-35 ans",
  },
  {
    key: "canal",
    question: "Sur quel canal sera-t-elle diffusée ?",
    placeholder: "Ex. : Instagram, affichage urbain…",
    chips: ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "Affichage"],
  },
  {
    key: "ton",
    question: "Quel ton doit-elle adopter ?",
    placeholder: "Ex. : complice, institutionnel…",
    chips: ["Complice", "Institutionnel", "Humoristique", "Premium", "Énergique"],
  },
  {
    key: "emotion",
    question: "Quelle émotion voulez-vous provoquer ?",
    placeholder: "Ex. : fierté, soulagement, urgence…",
    chips: ["Fierté", "Confiance", "Joie", "Urgence", "Soulagement", "Ambition"],
  },
  {
    key: "objectif",
    question: "Quel est l'objectif business ?",
    placeholder: "Ex. : acquisition, notoriété…",
    chips: ["Acquisition", "Notoriété", "Engagement", "Adoption d'un service", "Vente", "Génération de leads"],
  },
];

const EXTRA_STEPS: FieldStep[] = [
  { key: "marque", question: "Quelle marque doit apparaître ?", placeholder: "Nom exact de la marque" },
  { key: "promesse", question: "Quelle est la promesse à faire passer ?", placeholder: "Ce que la marque garantit" },
  { key: "texte", question: "Quel texte doit figurer dans l'image ?", placeholder: "Accroche exacte à intégrer" },
  { key: "format", question: "Quel format d'image ?", placeholder: "Ex. : 1:1, 4:5, 9:16" },
  { key: "charte", question: "Décrivez la charte graphique à respecter.", placeholder: "Couleurs, typographies…" },
  { key: "contraintes", question: "Quelles contraintes faut-il respecter ?", placeholder: "Mentions légales, interdits…" },
];

const EXTRA_LABELS: Record<string, string> = {
  marque: "La marque",
  promesse: "La promesse",
  texte: "Le texte à intégrer",
  format: "Le format",
  charte: "La charte graphique",
  contraintes: "Les contraintes",
};

type Stage =
  | { kind: "reference" }
  | { kind: "field"; step: FieldStep; required: boolean }
  | { kind: "extras" }
  | { kind: "generating" }
  | { kind: "done" };

interface TextIntent {
  accroche: string;
  texte_secondaire: string;
  cta: string;
}

interface GenResult {
  imageUrl: string | null;
  analysis: string | null;
  framework: string | null;
  chatgptPrompt?: string | null;
  textIntent?: TextIntent | null;
  remaining?: number;
}

interface Message {
  id: number;
  role: "assistant" | "user";
  text?: string;
  imageUrl?: string;
  result?: GenResult;
  error?: boolean;
}

let nextId = 1;

export default function StudioPubPage() {
  return (
    <Suspense fallback={null}>
      <StudioConversation />
    </Suspense>
  );
}

function StudioConversation() {
  const { checking } = useRequireActiveSubscription();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: "reference" });
  const [brief, setBrief] = useState<Record<string, string>>({});
  const [referencePath, setReferencePath] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);

  const say = useCallback((msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: nextId++ }]);
  }, []);

  // Fil toujours calé sur le dernier message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, stage]);

  // Ouverture de la conversation (une seule fois, pré-remplissage inclus).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const seeded: Record<string, string> = {};
    const secteur = searchParams.get("secteur");
    const canal = searchParams.get("canal");
    if (secteur) seeded.secteur = secteur;
    if (canal) seeded.canal = canal;
    if (Object.keys(seeded).length) setBrief(seeded);

    say({
      role: "assistant",
      text: "Bonjour ! Je vais vous aider à créer une nouvelle publicité à partir d'une création qui vous inspire. Sa logique — accroche, émotion, structure — sera transposée à votre projet, sans jamais copier le visuel d'origine.",
    });
    if (seeded.secteur || seeded.canal) {
      const parts = [
        seeded.secteur ? `le secteur « ${seeded.secteur} »` : null,
        seeded.canal ? `le canal « ${seeded.canal} »` : null,
      ].filter(Boolean);
      say({
        role: "assistant",
        text: `J'ai repris ${parts.join(" et ")} de la campagne que vous consultiez — vous pourrez me corriger si besoin.`,
      });
    }
    say({
      role: "assistant",
      text: "Pour commencer, envoyez-moi votre création de référence (PNG, JPEG ou WebP, 8 Mo max) avec le bouton ci-dessous.",
    });
  }, [say, searchParams]);

  /** Prochaine question obligatoire sans réponse, ou passage aux précisions. */
  const advance = useCallback(
    (currentBrief: Record<string, string>) => {
      const next = REQUIRED_STEPS.find((s) => !String(currentBrief[s.key] || "").trim());
      if (next) {
        say({ role: "assistant", text: next.question });
        setStage({ kind: "field", step: next, required: true });
      } else {
        say({
          role: "assistant",
          text: "J'ai tout ce qu'il me faut. Voulez-vous ajouter une précision, ou est-ce que je lance la génération ?",
        });
        setStage({ kind: "extras" });
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [say]
  );

  const uploadReference = async (file: File) => {
    if (busy) return;
    setBusy(true);

    const localPreview = URL.createObjectURL(file);
    say({ role: "user", imageUrl: localPreview });

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/studio/reference", { method: "POST", body });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        say({
          role: "assistant",
          error: true,
          text: `${data.error || "L'envoi de l'image a échoué."} Réessayez avec le bouton ci-dessous.`,
        });
        return;
      }

      setReferencePath(data.path);
      say({ role: "assistant", text: "Bien reçu, votre référence est enregistrée." });
      advance(brief);
    } catch {
      say({
        role: "assistant",
        error: true,
        text: "Erreur réseau pendant l'envoi. Vérifiez votre connexion puis réessayez.",
      });
    } finally {
      setBusy(false);
    }
  };

  const generate = useCallback(
    async (finalBrief: Record<string, string>) => {
      setStage({ kind: "generating" });
      say({
        role: "assistant",
        text: "Parfait, je m'y mets : j'analyse votre référence puis je génère la création. Comptez une minute environ — ne fermez pas cette page.",
      });

      try {
        const res = await fetch("/api/studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referencePath, brief: finalBrief }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // Brief incomplet : le serveur renvoie la liste des champs manquants
          // (état exigé par le brief IA). Inatteignable via la conversation, qui
          // garantit la complétude — mais l'état doit exister et être lisible.
          const missing: string[] = Array.isArray(data.missing) ? data.missing : [];
          say({
            role: "assistant",
            error: true,
            text: missing.length
              ? `Il me manque encore : ${missing.join(", ")}. Reprenons — répondez aux questions ci-dessous.`
              : data.error || "La génération a échoué. On réessaie ?",
          });
          setStage({ kind: "extras" });
          return;
        }

        if (typeof data.remaining === "number") setRemaining(data.remaining);
        say({
          role: "assistant",
          result: {
            imageUrl: data.imageUrl,
            analysis: data.analysis,
            framework: data.framework,
            chatgptPrompt: data.chatgptPrompt,
            textIntent: data.textIntent,
            remaining: data.remaining,
          },
        });
        setStage({ kind: "done" });
      } catch {
        say({
          role: "assistant",
          error: true,
          text: "Erreur réseau pendant la génération. Votre brief est conservé — dites « générer » pour réessayer.",
        });
        setStage({ kind: "extras" });
      }
    },
    [referencePath, say]
  );

  /** Réponse à une question (obligatoire ou précision), saisie ou puce. */
  const handleFieldAnswer = (raw: string) => {
    const answer = raw.trim();
    if (!answer || busy || stage.kind !== "field") return;
    setInput("");
    say({ role: "user", text: answer });
    const updated = { ...brief, [stage.step.key]: answer };
    setBrief(updated);

    if (stage.required) {
      advance(updated);
    } else {
      say({
        role: "assistant",
        text: `${EXTRA_LABELS[stage.step.key] || "C'est"} noté. Autre chose, ou je génère ?`,
      });
      setStage({ kind: "extras" });
    }
  };

  /** Réponse au carrefour des précisions : générer, ou nommer une précision. */
  const handleAnswer = (raw: string) => {
    const answer = raw.trim();
    if (!answer || busy || stage.kind !== "extras") return;
    setInput("");
    say({ role: "user", text: answer });
    const lower = answer.toLowerCase();

    // « générer », « non », « c'est bon »… : on part en génération.
    if (/g[ée]n[ée]r|lance|c'est (bon|tout)|^non\b|^ok\b|^go\b/.test(lower)) {
      generate(brief);
      return;
    }

    // Une précision nommée ? (« marque », « le format »…)
    const matched = EXTRA_STEPS.find((s) =>
      lower.includes(s.key === "texte" ? "texte" : s.key)
    );
    if (matched) {
      say({ role: "assistant", text: matched.question });
      setStage({ kind: "field", step: matched, required: false });
      return;
    }

    say({
      role: "assistant",
      text: "Je n'ai pas compris. Choisissez une précision ci-dessous, ou cliquez sur « Générer la création ».",
    });
  };

  const submit = () => {
    if (stage.kind === "field") handleFieldAnswer(input);
    else handleAnswer(input);
  };

  const restart = () => {
    setBrief({});
    setReferencePath(null);
    setRemaining(null);
    setStage({ kind: "reference" });
    say({
      role: "assistant",
      text: "On repart de zéro. Envoyez-moi la nouvelle création de référence.",
    });
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chips =
    stage.kind === "field" && stage.step.chips
      ? stage.step.chips
      : stage.kind === "extras"
        ? EXTRA_STEPS.map((s) => EXTRA_LABELS[s.key])
        : [];

  const composerEnabled = stage.kind === "field" || stage.kind === "extras";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardNavbar />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between gap-3 border-b border-border py-4">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Wand2 className="h-5 w-5 text-[#F2B33D]" />
            Studio publicitaire
          </h1>
          <div className="flex items-center gap-3">
            {remaining !== null && (
              <span className="text-xs text-muted-foreground">
                {remaining} génération{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} aujourd&apos;hui
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={restart}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Recommencer
            </Button>
          </div>
        </header>

        {/* ---- Fil de conversation ---- */}
        <div
          className="flex-1 space-y-4 overflow-y-auto py-6"
          aria-live="polite"
          aria-label="Conversation avec le studio"
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onRegenerate={() => generate(brief)} />
          ))}

          {stage.kind === "generating" && (
            <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-[#F2B33D]" />
              Analyse et génération en cours…
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* ---- Suggestions ---- */}
        {chips.length > 0 && !busy && (
          <div className="flex flex-wrap gap-2 pb-3">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() =>
                  stage.kind === "field" ? handleFieldAnswer(chip) : handleAnswer(chip)
                }
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-[#F2B33D] hover:bg-[#FFF6E3] hover:text-[#0F0F0F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B33D]"
              >
                {chip}
              </button>
            ))}
            {stage.kind === "extras" && (
              <button
                type="button"
                onClick={() => handleAnswer("générer")}
                className="rounded-full bg-[#F2B33D] px-4 py-1.5 text-sm font-bold text-[#0F0F0F] transition-[filter] hover:brightness-95"
              >
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                Générer la création
              </button>
            )}
          </div>
        )}

        {/* ---- Composeur ---- */}
        <div className="sticky bottom-0 border-t border-border bg-background pb-5 pt-3">
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

          {stage.kind === "reference" ? (
            <Button
              size="lg"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="w-full bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Envoi de l&apos;image…
                </>
              ) : (
                <>
                  <ImagePlus className="mr-2 h-5 w-5" />
                  Envoyer ma création de référence
                </>
              )}
            </Button>
          ) : (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!composerEnabled || busy}
                placeholder={
                  stage.kind === "field"
                    ? stage.step.placeholder
                    : stage.kind === "extras"
                      ? "Répondez, ou cliquez sur « Générer la création »"
                      : "Génération en cours…"
                }
                aria-label="Votre réponse"
                className="h-12 flex-1 rounded-full border border-border bg-card px-5 text-[15px] outline-none transition-colors focus:border-[#F2B33D] focus:ring-2 focus:ring-[#F2B33D]/25 disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!composerEnabled || busy || !input.trim()}
                aria-label="Envoyer"
                className="h-12 w-12 shrink-0 rounded-full bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]"
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------- Bulles */

function MessageBubble({ msg, onRegenerate }: { msg: Message; onRegenerate: () => void }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#F2B33D] px-4 py-2.5 text-[15px] text-[#0F0F0F]">
          {msg.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local/URL signée
            <img
              src={msg.imageUrl}
              alt="Votre création de référence"
              className="max-h-56 rounded-lg"
            />
          ) : (
            msg.text
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F2B33D]/15">
        <Sparkles className="h-4 w-4 text-[#F2B33D]" />
      </div>

      {msg.result ? (
        <ResultBubble result={msg.result} onRegenerate={onRegenerate} />
      ) : (
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-tl-md px-4 py-2.5 text-[15px] leading-relaxed",
            msg.error
              ? "border border-destructive/40 bg-destructive/5 text-foreground"
              : "bg-muted/60 text-foreground"
          )}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

function ResultBubble({ result, onRegenerate }: { result: GenResult; onRegenerate: () => void }) {
  return (
    <div className="max-w-[85%] space-y-3 rounded-2xl rounded-tl-md border border-border bg-card p-4">
      <p className="text-[15px] font-semibold">Voici votre création :</p>

      {result.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
        <img
          src={result.imageUrl}
          alt="Création générée"
          className="w-full rounded-lg border border-border"
        />
      ) : (
        <p className="text-sm text-muted-foreground">Aucune image n&apos;a été retournée.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {result.imageUrl && (
          <Button asChild size="sm" className="bg-[#F2B33D] text-[#0F0F0F] hover:bg-[#E4A82F]">
            <a href={result.imageUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="mr-1.5 h-4 w-4" />
              Télécharger
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Une autre version
        </Button>
      </div>

      {result.textIntent && (
        <div className="space-y-2 rounded-lg border border-[#F2B33D]/40 bg-[#FFF6E3]/60 p-3 text-sm dark:bg-[#F2B33D]/10">
          <p className="font-semibold">Intention de texte</p>
          <dl className="space-y-1.5">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accroche</dt>
              <dd className="m-0 font-medium">« {result.textIntent.accroche} »</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Texte secondaire</dt>
              <dd className="m-0 text-muted-foreground">{result.textIntent.texte_secondaire}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Appel à l&apos;action</dt>
              <dd className="m-0 text-muted-foreground">{result.textIntent.cta}</dd>
            </div>
          </dl>
        </div>
      )}

      {result.chatgptPrompt && <PromptToCopy prompt={result.chatgptPrompt} />}

      {(result.analysis || result.framework) && (
        <details className="rounded-lg bg-muted/40 p-3 text-sm">
          <summary className="cursor-pointer font-semibold">
            Ce que j&apos;ai retenu de votre référence
          </summary>
          {result.analysis && <p className="mt-2 text-muted-foreground">{result.analysis}</p>}
          {result.framework && (
            <p className="mt-2 text-muted-foreground">{result.framework}</p>
          )}
        </details>
      )}

      <p className="text-xs text-muted-foreground">
        Besoin d&apos;inspiration pour une prochaine référence ?{" "}
        <Link href="/dashboard" className="underline hover:text-foreground">
          Parcourez la bibliothèque
        </Link>
        .
      </p>
    </div>
  );
}

/** Prompt complet à coller dans ChatGPT (ou tout autre générateur d'images). */
function PromptToCopy({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* navigateur sans presse-papiers : la sélection manuelle reste possible */
    }
  };

  return (
    <details className="rounded-lg bg-muted/40 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">
        Prompt pour ChatGPT (ou un autre générateur)
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Collez-le tel quel dans ChatGPT pour retravailler le visuel avec un rendu de
        texte souvent plus soigné — le brief et la logique de votre référence y sont déjà.
      </p>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs leading-relaxed">
        {prompt}
      </pre>
      <Button size="sm" variant="outline" className="mt-2" onClick={copy}>
        {copied ? (
          <>
            <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
            Copié
          </>
        ) : (
          <>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copier le prompt
          </>
        )}
      </Button>
    </details>
  );
}
