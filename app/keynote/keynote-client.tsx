"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

// ── Cible : 21 mai 2026 18h30 (Abidjan, UTC+0) ───────────────────────────────
const TARGET_DATE = new Date("2026-05-21T18:30:00Z");

const COUNTRIES = [
  "Côte d'Ivoire",
  "Cameroun",
  "Bénin",
  "Togo",
  "Burkina Faso",
  "Gabon",
  "Guinée",
  "Sénégal",
  "Mali",
  "France",
  "Autre",
];

const BENEFITS: { html: React.ReactNode }[] = [
  { html: <><strong>Démonstration live</strong> de la plateforme en direct</> },
  { html: <><strong>500 campagnes africaines</strong> analysées et classifiées</> },
  { html: <><strong>Retours bêta testeurs</strong> sur cas d&apos;usage réels</> },
  { html: <><strong>Offre exclusive</strong> réservée aux participants du keynote (48h)</> },
];

const STATS = [
  { num: "500", label: "Campagnes africaines analysées" },
  { num: "7", label: "Marchés francophones couverts" },
  { num: "4 900", label: "FCFA TTC / mois après lancement" },
  { num: "1ère", label: "Bibliothèque créative africaine" },
];

const PROBLEMS = [
  { num: "01", text: <><strong>Pas de références locales.</strong> Les campagnes africaines ne sont nulle part documentées.</> },
  { num: "02", text: <><strong>Inspiration perdue dans le scroll.</strong> Des heures à chercher sans structure, sans filtres, sans analyse.</> },
  { num: "03", text: <><strong>Impossible de benchmarker.</strong> Difficile de comparer les approches créatives par secteur ou par pays.</> },
  { num: "04", text: <><strong>Des briefs sans données.</strong> Convaincre un client sans exemples africains comparables.</> },
  { num: "05", text: <><strong>Pas de communauté dédiée.</strong> Les créatifs africains manquent d&apos;un espace structuré.</> },
];

const PROGRAM = [
  { step: "01", title: "Origine du projet", desc: "D'où vient LAVEIYE, pourquoi Big Five l'a créé, et quel manque structurel elle comble." },
  { step: "02", title: "Démonstration live", desc: "Navigation en direct sur la plateforme. Filtres, campagnes, analyses." },
  { step: "03", title: "Retours bêta testeurs", desc: "Ce que les professionnels qui ont testé LAVEIYE en avant-première ont découvert." },
  { step: "04", title: "Offre exclusive participants", desc: "L'offre de pré-lancement réservée aux participants du keynote — 3 mois pour 10 000 FCFA, 48h." },
];

// ── Countdown ────────────────────────────────────────────────────────────────
function useCountdown(target: Date) {
  const [time, setTime] = useState({ j: "--", h: "--", m: "--", s: "--" });
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setTime({ j: "00", h: "00", m: "00", s: "00" });
        return;
      }
      setTime({
        j: String(Math.floor(diff / 86400000)).padStart(2, "0"),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

// ── Form ─────────────────────────────────────────────────────────────────────
type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; promoCode: string; isNew: boolean }
  | { status: "error"; error: string };

function RegistrationForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.status === "submitting") return;
    setState({ status: "submitting" });
    try {
      const res = await fetch("/api/keynote/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, country }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState({ status: "error", error: data.error || "Erreur d'inscription" });
        return;
      }
      setState({ status: "success", promoCode: data.promoCode, isNew: !!data.isNew });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur réseau";
      setState({ status: "error", error: msg });
    }
  };

  const copyCode = async () => {
    if (state.status !== "success") return;
    try {
      await navigator.clipboard.writeText(state.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (state.status === "success") {
    return (
      <div className="text-center py-2">
        <div
          className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: "#fef8ec", border: "1px solid rgba(242,179,61,0.4)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F2B33D" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3
          className="mb-2"
          style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700, color: "#0f0f0f" }}
        >
          {state.isNew ? "Vous êtes inscrit !" : "Vous êtes déjà inscrit"}
        </h3>
        <p className="text-base text-[#0f0f0f] leading-relaxed mb-5">
          Un email de confirmation vous a été envoyé.<br />
          Voici votre <strong style={{ color: "#F2B33D" }}>code promo de pré-lancement</strong> :
        </p>

        <div
          className="rounded-md p-5 mb-3"
          style={{
            background: "linear-gradient(135deg, #fef8ec 0%, #fffbf0 100%)",
            border: "1px dashed rgba(242,179,61,0.5)",
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0f0f0f] mb-2">
            Votre code promo
          </div>
          <div
            className="select-all break-all"
            style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 700, color: "#0f0f0f", letterSpacing: "0.05em" }}
          >
            {state.promoCode}
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="mt-3 inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-opacity"
            style={{ background: "#0f0f0f", color: "#fff" }}
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                Copié
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Copier le code
              </>
            )}
          </button>
        </div>

        <p className="text-sm text-[#0f0f0f] leading-relaxed">
          <strong className="text-[#0f0f0f]">3 mois d&apos;accès LAVEIYE pour 10 000 FCFA TTC</strong>
          <br />
          au lieu de 14 700 FCFA. Offre valable 48h après le keynote du 21 mai 2026.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">Prénom</label>
          <input
            type="text"
            className="form-input"
            placeholder="Koffi"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">Nom</label>
          <input
            type="text"
            className="form-input"
            placeholder="Adjoumani"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <label className="form-label">Adresse email</label>
      <input
        type="email"
        className="form-input"
        placeholder="votre@email.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className="form-label">Pays</label>
      <select
        className="form-input"
        required
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        style={{ cursor: "pointer", color: country ? "#0f0f0f" : "#6b6b6b" }}
      >
        <option value="" disabled>
          Sélectionnez votre pays
        </option>
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {state.status === "error" && (
        <div
          className="rounded-md text-xs px-3 py-2 mb-3"
          style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={state.status === "submitting"}
        className="w-full font-bold text-base rounded-md transition-all"
        style={{
          background: "#F2B33D",
          color: "#0f0f0f",
          padding: "16px 22px",
          border: "none",
          cursor: state.status === "submitting" ? "wait" : "pointer",
          opacity: state.status === "submitting" ? 0.7 : 1,
        }}
      >
        {state.status === "submitting"
          ? "Inscription en cours…"
          : "Réserver ma place gratuitement →"}
      </button>
      <p className="text-center text-xs text-[#0f0f0f] mt-3 leading-relaxed">
        Aucun spam. Désinscription possible à tout moment.
      </p>
    </form>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function KeynoteClient() {
  const target = useMemo(() => TARGET_DATE, []);
  const time = useCountdown(target);

  const scrollToForm = () => {
    document.getElementById("keynote-form-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ fontFamily: "var(--font-sans)", color: "#1a1a1a", background: "#ffffff" }}
    >
      {/* Styles scoped */}
      <style>{`
        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #0f0f0f;
          margin-bottom: 8px;
        }
        .form-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d4cfc1;
          border-radius: 6px;
          padding: 14px 16px;
          font-family: var(--font-sans);
          font-size: 16px;
          color: #0f0f0f;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 16px;
          box-sizing: border-box;
        }
        .form-input:focus { border-color: #F2B33D; }
        .form-input::placeholder { color: #9b9b9b; }

        .keynote-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(420px, 540px);
          min-height: 100vh;
          padding-top: 68px;
        }
        .keynote-hero-left {
          padding: 64px 56px 64px 72px;
          border-right: 1px solid #f0ede6;
          position: relative;
          min-width: 0;
        }
        .keynote-hero-right {
          background: #faf9f6;
          padding: 64px 40px;
          display: flex; align-items: center; justify-content: center;
          min-width: 0;
        }
        .problems-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #ede9e0;
          border: 1px solid #ede9e0;
        }
        .program-layout {
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start;
        }
        @media (max-width: 1100px) {
          .keynote-hero { grid-template-columns: minmax(0, 1fr) minmax(380px, 460px); }
          .keynote-hero-left { padding: 56px 40px; }
          .keynote-hero-right { padding: 56px 32px; }
        }
        @media (max-width: 900px) {
          .keynote-hero { grid-template-columns: 1fr; }
          .keynote-hero-left { padding: 80px 24px 48px; border-right: none; border-bottom: 1px solid #f0ede6; }
          .keynote-hero-right { padding: 40px 24px; }
          .problems-grid { grid-template-columns: 1fr; }
          .program-layout { grid-template-columns: 1fr; gap: 32px; }
          .stats-row { flex-direction: column; }
          .stats-row > .stat { border-right: none !important; border-bottom: 1px solid #f0ede6; }
          .stats-row > .stat:last-child { border-bottom: none; }
          .keynote-section { padding: 64px 24px !important; }
          .keynote-footer { flex-direction: column; gap: 8px; text-align: center; padding: 24px !important; }
          .keynote-nav { padding: 0 24px !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav
        className="keynote-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
        style={{
          height: 68,
          padding: "0 60px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #f0ede6",
        }}
      >
        <a
          href="/"
          className="no-underline inline-flex items-center"
          aria-label="Accueil LAVEIYE"
        >
          <Image
            src="/niggaz/normalGlogo.png"
            alt="LAVEIYE"
            width={170}
            height={36}
            className="h-7 md:h-8 w-auto"
            priority
          />
        </a>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#0f0f0f]">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F2B33D" }} />
          <span>Keynote ·</span>
          <span className="text-[#0f0f0f] font-bold">Jeudi 21 mai 2026 · 18h30</span>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="keynote-hero">
        {/* LEFT */}
        <div className="keynote-hero-left flex flex-col justify-center">
          <div
            className="absolute right-0 hidden md:block"
            style={{
              top: "10%",
              bottom: "10%",
              width: 3,
              background: "linear-gradient(to bottom, transparent, #F2B33D, transparent)",
              opacity: 0.45,
            }}
          />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-px" style={{ background: "#F2B33D" }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#F2B33D" }}>
              Keynote de lancement
            </span>
          </div>

          <h1
            className="mb-5"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(44px, 5.5vw, 76px)",
              fontWeight: 700,
              lineHeight: 1.06,
              color: "#0f0f0f",
            }}
          >
            L&apos;inspiration créative
            <br />
            <em className="not-italic" style={{ color: "#F2B33D" }}>SANS limite</em>
          </h1>

          <p className="text-lg font-normal leading-relaxed text-[#0f0f0f] max-w-md mb-8">
            Rejoignez la keynote de lancement de{" "}
            <strong className="text-[#0f0f0f] font-bold">LAVEIYE</strong>. La première bibliothèque
            cr&eacute;ative social media d&eacute;di&eacute;e &agrave; l&apos;Afrique francophone. 500 campagnes analys&eacute;es, 7
            march&eacute;s couverts.
          </p>

          {/* Chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              <><strong>21 mai 2026</strong></>,
              <><strong>18h30</strong>&nbsp;— Zoom</>,
              <>7 pays couverts</>,
              <>Entrée gratuite</>,
            ].map((label, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-sm font-medium text-[#0f0f0f] px-3 py-2 rounded-full"
                style={{ border: "1px solid #ede9e0", background: "#faf9f6" }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div className="flex items-start gap-4 mb-10">
            {[
              { val: time.j, label: "Jours" },
              { val: time.h, label: "Heures" },
              { val: time.m, label: "Min" },
              { val: time.s, label: "Sec" },
            ].map((b, i) => (
              <div key={b.label} className="flex items-start gap-4">
                <div className="text-center">
                  <span
                    className="block leading-none min-w-[54px]"
                    style={{ fontFamily: "var(--font-heading)", fontSize: 48, fontWeight: 700, color: "#0f0f0f" }}
                  >
                    {b.val}
                  </span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f0f0f] mt-1">
                    {b.label}
                  </span>
                </div>
                {i < 3 && (
                  <span className="pt-1.5" style={{ fontFamily: "var(--font-heading)", fontSize: 36, color: "#d4d4d4" }}>
                    :
                  </span>
                )}
              </div>
            ))}
          </div>

          <ul className="space-y-3">
            {BENEFITS.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-base text-[#0f0f0f] leading-relaxed">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "#fef8ec", border: "1px solid rgba(242,179,61,0.4)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F2B33D" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <span>{b.html}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT — Form */}
        <div className="keynote-hero-right">
          <div className="w-full max-w-md" id="keynote-form-anchor">
            <div
              className="rounded-md"
              style={{
                background: "#fff",
                border: "1px solid #ede9e0",
                boxShadow: "0 4px 32px rgba(0,0,0,0.06)",
                padding: "36px 32px",
              }}
            >
              <div className="mb-6">
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700, color: "#0f0f0f" }}>
                  Réservez votre place
                </h2>
                <p className="text-sm font-medium text-[#0f0f0f] mt-2">
                  Gratuit · En ligne ·{" "}
                  <strong style={{ color: "#F2B33D" }}>Places limitées</strong>
                </p>
              </div>
              <RegistrationForm />
            </div>

            {/* Big Five mention */}
            <div className="mt-5 text-center">
              <a
                href="/"
                className="inline-flex items-center gap-2 transition-opacity"
                style={{ opacity: 0.7 }}
              >
                <Image src="/logo.png" alt="Big Five" width={20} height={20} className="object-contain" />
                <span className="text-sm font-medium text-[#0f0f0f]">une initiative Big Five Abidjan</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div
        className="stats-row flex"
        style={{ borderTop: "1px solid #f0ede6", borderBottom: "1px solid #f0ede6" }}
      >
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className="stat flex-1 py-8 text-center"
            style={{ borderRight: i < STATS.length - 1 ? "1px solid #f0ede6" : undefined }}
          >
            <span
              className="block leading-none mb-1"
              style={{ fontFamily: "var(--font-heading)", fontSize: 44, fontWeight: 700, color: "#F2B33D" }}
            >
              {s.num}
            </span>
            <span className="text-sm font-medium text-[#0f0f0f]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── PROBLÈMES ── */}
      <section className="keynote-section" style={{ padding: "100px 80px", background: "#faf9f6" }}>
        <div
          className="flex items-center gap-3 mb-4 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "#F2B33D" }}
        >
          <span className="w-7 h-px inline-block" style={{ background: "#F2B33D" }} />
          Le problème
        </div>
        <h2
          className="mb-12 max-w-xl"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(30px, 4vw, 52px)",
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#0f0f0f",
          }}
        >
          Ce que vivent les professionnels du digital en Afrique
        </h2>
        <div className="problems-grid">
          {PROBLEMS.map((p) => (
            <div key={p.num} className="p-7" style={{ background: "#fff" }}>
              <div
                className="leading-none mb-3"
                style={{ fontFamily: "var(--font-heading)", fontSize: 52, fontWeight: 700, color: "rgba(242,179,61,0.18)" }}
              >
                {p.num}
              </div>
              <p className="text-base text-[#0f0f0f] leading-relaxed">{p.text}</p>
            </div>
          ))}
          <div className="p-7" style={{ background: "#0f0f0f" }}>
            <div
              className="leading-none mb-3"
              style={{ fontFamily: "var(--font-heading)", fontSize: 52, fontWeight: 700, color: "rgba(242,179,61,0.3)" }}
            >
              →
            </div>
            <p className="text-base leading-relaxed" style={{ color: "#ffffff" }}>
              <strong style={{ color: "#F2B33D" }}>LAVEIYE résout tout ça.</strong> Lors du keynote, nous vous montrons comment en direct, sur la plateforme.
            </p>
          </div>
        </div>
      </section>

      {/* ── PROGRAMME ── */}
      <section className="keynote-section" style={{ padding: "100px 80px" }}>
        <div className="program-layout">
          <div>
            <div
              className="flex items-center gap-3 mb-4 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: "#F2B33D" }}
            >
              <span className="w-7 h-px inline-block" style={{ background: "#F2B33D" }} />
              Programme
            </div>
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(26px, 3.5vw, 44px)",
                fontWeight: 700,
                lineHeight: 1.1,
                color: "#0f0f0f",
              }}
            >
              Ce qui se passera lors du keynote
            </h2>
            <p className="text-base text-[#0f0f0f] leading-relaxed">
              Une heure pour découvrir, comprendre et agir. Pas un webinaire de vente. Un moment de
              lancement.
            </p>
          </div>
          <ul>
            {PROGRAM.map((item, i) => (
              <li
                key={item.step}
                className="py-5"
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr",
                  gap: "1rem",
                  borderTop: "1px solid #f0ede6",
                  borderBottom: i === PROGRAM.length - 1 ? "1px solid #f0ede6" : undefined,
                }}
              >
                <span
                  className="text-base font-bold pt-0.5"
                  style={{ color: "#F2B33D", fontFamily: "var(--font-heading)" }}
                >
                  {item.step}
                </span>
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: "#0f0f0f" }}>
                    {item.title}
                  </p>
                  <p className="text-sm text-[#0f0f0f] leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA BAS ── */}
      <section
        className="keynote-section text-center relative overflow-hidden"
        style={{ padding: "100px 80px", background: "#0f0f0f", color: "#fff" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 700px 400px at 50% 50%, rgba(242,179,61,0.1) 0%, transparent 70%)",
          }}
        />
        <h2
          className="relative mb-4"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          Rejoignez le lancement.
          <br />
          <span style={{ color: "#F2B33D" }}>Jeudi 21 mai. 18h30.</span>
        </h2>
        <p className="relative text-lg mb-8" style={{ color: "rgba(255,255,255,0.85)" }}>
          Gratuit · En ligne · Code promo envoyé après inscription
        </p>
        <button
          onClick={scrollToForm}
          className="relative inline-flex items-center gap-2 font-bold text-base transition-all"
          style={{
            background: "#F2B33D",
            color: "#0f0f0f",
            padding: "18px 48px",
            borderRadius: 6,
            fontFamily: "var(--font-sans)",
            border: "none",
            cursor: "pointer",
          }}
        >
          Je réserve ma place
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="keynote-footer flex items-center justify-between"
        style={{ padding: "28px 80px", borderTop: "1px solid #f0ede6", background: "#faf9f6" }}
      >
        <a href="/" className="inline-flex items-center" aria-label="Accueil LAVEIYE">
          <Image
            src="/niggaz/normalGlogo.png"
            alt="LAVEIYE"
            width={150}
            height={32}
            className="h-6 w-auto"
          />
        </a>
        <span className="text-sm font-medium text-[#0f0f0f]">
          Première bibliothèque créative social media dédiée à l&apos;Afrique francophone
        </span>
      </footer>
    </div>
  );
}
