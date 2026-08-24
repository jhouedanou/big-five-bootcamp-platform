"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { StudyContent } from "@/lib/studies";
import { trackEvent } from "@/lib/analytics";
import { fbTrack, hasMarketingConsent } from "@/lib/fb-pixel";

interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  referrer?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  study: StudyContent;
  utm: UtmParams;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  consent: boolean;
  /** Honeypot : invisible pour l'humain, rempli par les bots. */
  website: string;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  consent: false,
  website: "",
};

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

export function StudyLeadModal({ open, onClose, study, utm }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Échap ferme la modale, et le scroll de la page est gelé pendant l'ouverture
  // pour que la position de défilement soit intacte à la fermeture.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setStatus({ kind: "idle" });

    try {
      const res = await fetch("/api/etudes/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Le choix RGPD est relayé au serveur : l'événement Meta serveur part
        // dans tous les cas (il constate une conversion réelle), mais sans les
        // identifiants du navigateur si le visiteur a refusé le marketing.
        body: JSON.stringify({
          slug: study.slug,
          ...form,
          ...utm,
          marketingConsent: hasMarketingConsent(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data.error || "Une erreur est survenue. Veuillez réessayer.",
        });
        return;
      }

      trackEvent(
        "study_form_submitted",
        {
          study_slug: study.slug,
          utm_source: utm.utm_source || "direct",
          already_registered: !!data.alreadyRegistered,
          source: "web",
        },
        true
      );

      // Pixel Meta avec l'event_id renvoyé par le serveur : celui-ci a déjà
      // envoyé le même Lead via la Conversions API, Meta dédoublonne sur cet
      // identifiant. Sans consentement marketing, fbTrack est un no-op.
      if (data.eventId) {
        fbTrack("Lead", { content_name: study.title }, data.eventId);
      }

      // Trois issues distinctes : fichier prêt, fichier pas encore déposé, ou
      // email en échec. Le lead est enregistré dans les trois cas — le message
      // doit dire la vérité plutôt qu'un « c'est envoyé » systématique.
      if (!data.emailSent) {
        setStatus({
          kind: "success",
          message:
            "Votre demande a bien été prise en compte. L'envoi de l'email a rencontré un incident — notre équipe vous transmet l'étude au plus vite.",
        });
      } else if (!data.fileAvailable) {
        setStatus({
          kind: "success",
          message:
            "Votre demande a bien été prise en compte. L'étude vous sera envoyée par email dès sa mise à disposition.",
        });
      } else {
        setStatus({
          kind: "success",
          message: data.alreadyRegistered
            ? "Cette adresse email était déjà enregistrée pour cette étude. Nous venons de vous renvoyer le lien de téléchargement."
            : "Votre demande a bien été prise en compte. Un email contenant l'accès à l'étude vient de vous être envoyé.",
        });
        trackEvent("study_download", { study_slug: study.slug, source: "web" }, true);
      }

      setForm(EMPTY);
    } catch {
      setStatus({
        kind: "error",
        message: "Erreur réseau. Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5"
      onMouseDown={(e) => {
        // Clic en dehors de la carte : fermeture. On écoute mousedown sur la
        // seule cible du fond pour ne pas fermer sur un glisser depuis l'intérieur.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[92vh] w-[min(620px,100%)] overflow-auto rounded-[18px] bg-white p-7 text-[#171717]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-3 text-[28px] leading-none text-[#5c5c5c] transition-colors hover:text-[#171717]"
        >
          ×
        </button>

        <h2 id={titleId} className="mb-2 mr-10 font-serif text-[28px] sm:text-[34px]">
          Recevoir l&apos;étude
        </h2>
        <p className="mb-6 text-[#5c5c5c]">
          Renseignez vos coordonnées pour accéder au téléchargement.
        </p>

        {status.kind === "success" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-[15px] leading-relaxed text-emerald-900">{status.message}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-[10px] bg-[linear-gradient(135deg,#7b3f9a,#2c4095)] px-5 py-2.5 font-bold text-white hover:brightness-95"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom(s)" required>
                <input
                  ref={firstFieldRef}
                  type="text"
                  required
                  maxLength={100}
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  className={inputClass}
                  autoComplete="given-name"
                />
              </Field>

              <Field label="Nom" required>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  className={inputClass}
                  autoComplete="family-name"
                />
              </Field>

              <Field label="Adresse email" required className="sm:col-span-2">
                <input
                  type="email"
                  required
                  maxLength={200}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
              </Field>

              <Field label="Numéro de contact ou WhatsApp" required className="sm:col-span-2">
                <input
                  type="tel"
                  required
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inputClass}
                  autoComplete="tel"
                />
              </Field>

              <Field label="Entreprise">
                <input
                  type="text"
                  maxLength={150}
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                  className={inputClass}
                  autoComplete="organization"
                />
              </Field>

              <Field label="Fonction">
                <input
                  type="text"
                  maxLength={150}
                  value={form.jobTitle}
                  onChange={(e) => set("jobTitle", e.target.value)}
                  className={inputClass}
                  autoComplete="organization-title"
                />
              </Field>
            </div>

            {/* Honeypot — masqué visuellement et retiré du parcours clavier. */}
            <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
              <label htmlFor="website">Ne pas remplir</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-[#4e4e4e]">
              <input
                type="checkbox"
                required
                checked={form.consent}
                onChange={(e) => set("consent", e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[#7b3f9a]"
              />
              <span>
                J&apos;accepte que mes informations soient utilisées pour l&apos;envoi de cette étude.
              </span>
            </label>

            {status.kind === "error" && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {status.message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-[10px] bg-[linear-gradient(135deg,#7b3f9a,#2c4095)] px-6 py-[15px] font-extrabold text-white transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Envoi en cours…" : study.ctaLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-[10px] border border-[#d9d6d1] bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-[#7b3f9a] focus:ring-2 focus:ring-[#7b3f9a]/20";

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-[#2b2b2b]">
        {label}
        {required && <span className="ml-0.5 text-[#7b3f9a]">*</span>}
      </span>
      {children}
    </label>
  );
}
