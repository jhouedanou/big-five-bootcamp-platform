"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { StudyContent } from "@/lib/studies";
import { StudyLeadModal } from "@/components/etudes/study-lead-modal";
// `persist = true` : ces événements alimentent les KPI de /admin/etudes, il
// faut donc qu'ils atterrissent dans analytics_events et pas seulement dans GA4.
import { trackEvent } from "@/lib/analytics";

/** Clés UTM capturées à l'arrivée puis renvoyées avec le lead. */
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  referrer?: string;
};

/** Survit à une navigation interne : le visiteur peut arriver puis scroller. */
const UTM_STORAGE_KEY = "bigfive:etude-utm";

export function StudyLandingClient({ study }: { study: StudyContent }) {
  const [modalOpen, setModalOpen] = useState(false);
  // Le CTA qui a ouvert la modale voyage jusqu'à l'abandon : savoir laquelle
  // des deux invitations perd le visiteur est la moitié de l'information.
  const [modalOrigin, setModalOrigin] = useState("hero");
  const [utm, setUtm] = useState<UtmParams>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const captured: UtmParams = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) captured[key] = value.slice(0, 200);
    }

    // Rien dans l'URL : on retombe sur ce qui a été capté à l'arrivée.
    if (Object.keys(captured).length === 0) {
      try {
        const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
        if (stored) Object.assign(captured, JSON.parse(stored));
      } catch {
        /* sessionStorage indisponible : on continue sans UTM */
      }
    }

    captured.referrer = document.referrer || "direct";
    setUtm(captured);

    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(captured));
    } catch {
      /* ignore */
    }

    trackEvent(
      "study_page_view",
      {
        study_slug: study.slug,
        utm_source: captured.utm_source || "direct",
        utm_medium: captured.utm_medium,
        utm_campaign: captured.utm_campaign,
        source: "web",
      },
      true
    );
  }, [study.slug]);

  const openModal = useCallback(
    (origin: string) => {
      setModalOpen(true);
      setModalOrigin(origin);
      trackEvent(
        "study_form_open",
        {
          study_slug: study.slug,
          cta: origin,
          utm_source: utm.utm_source || "direct",
          source: "web",
        },
        true
      );
    },
    [study.slug, utm.utm_source]
  );

  return (
    <div className="min-h-screen bg-white text-[#171717] antialiased">
      <header className="bg-white pt-7 pb-4">
        <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
          <div className="flex justify-center">
            <Image
              src="/blcklogo.webp"
              alt="Big Five — Laissez votre empreinte"
              width={132}
              height={44}
              priority
              className="h-auto w-[132px]"
            />
          </div>
        </div>
      </header>

      <Hero study={study} onCta={() => openModal("hero")} />
      <PreviewAndBenefits study={study} />
      <Faq study={study} />
      <FinalCta study={study} onCta={() => openModal("footer")} />

      <footer className="bg-[#171717] py-11 text-white">
        <div className="mx-auto w-[min(1180px,calc(100%-40px))] text-center text-sm">
          Copyright © {new Date().getFullYear()} Big Five.
        </div>
      </footer>

      <StudyLeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        study={study}
        utm={utm}
        cta={modalOrigin}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Hero */

function Hero({ study, onCta }: { study: StudyContent; onCta: () => void }) {
  return (
    <section className="overflow-hidden bg-white pt-10 pb-16 lg:pt-13 lg:pb-[74px]">
      <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-[76px]">
          <div>
            <p className="mb-4 text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#7b3f9a]">
              {study.eyebrow}
            </p>
            <h1 className="mb-5 font-serif text-[clamp(34px,5.3vw,74px)] font-medium leading-[1.06] text-[#060606]">
              {study.title}
            </h1>
            <p className="mb-3.5 font-serif text-[22px] text-[#2b2b2b] sm:text-[28px]">
              {study.subtitle}
            </p>
            <p className="mb-7 max-w-[620px] text-[17px] leading-relaxed text-[#4e4e4e] sm:text-[19px]">
              {study.description}
            </p>
            <CtaButton onClick={onCta}>{study.ctaLabel}</CtaButton>
          </div>

          <BookMockup cover={study.cover} />
        </div>
      </div>
    </section>
  );
}

/** Couverture présentée comme un livre debout, légère perspective, ombre douce. */
function BookMockup({ cover }: { cover: StudyContent["cover"] }) {
  return (
    <div className="grid place-items-center [perspective:1400px]">
      <div className="relative w-[min(420px,82%)] [transform:rotateY(-18deg)_rotateZ(1deg)] [transform-style:preserve-3d] drop-shadow-[0_28px_45px_rgba(0,0,0,0.18)]">
        <Image
          src={cover.src}
          alt={cover.alt}
          width={893}
          height={1263}
          priority
          sizes="(max-width: 1024px) 82vw, 420px"
          className="w-full rounded-[6px_10px_10px_6px] border border-black/10 object-cover"
        />
        {/* Tranche du livre */}
        <span
          aria-hidden
          className="absolute right-[-18px] top-[7px] h-[calc(100%-14px)] w-[18px] rounded-r-[3px] bg-gradient-to-b from-[#f0f0f0] to-[#d7d7d7] [transform:rotateY(90deg)] [transform-origin:left_center]"
        />
        {/* Ombre portée au sol */}
        <span
          aria-hidden
          className="absolute inset-x-[12%] bottom-[-22px] h-[22px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.06)_55%,transparent_100%)]"
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------- Prévisualisation + bénéfices */

function PreviewAndBenefits({ study }: { study: StudyContent }) {
  return (
    <section className="bg-[#f6f4ef] py-14 lg:py-[78px]">
      <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
        <div className="grid items-center gap-14 lg:grid-cols-[.95fr_1.05fr] lg:gap-[70px]">
          <Carousel slides={study.slides} studySlug={study.slug} />

          <div>
            <h2 className="mb-6 font-serif text-[30px] font-medium leading-[1.15] sm:text-[44px]">
              {study.benefitsTitle}
            </h2>
            <ul className="grid gap-4">
              {study.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-[16px] sm:text-[18px]">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-6 w-6 flex-[0_0_24px] place-items-center rounded-full bg-[#111] text-[13px] text-white"
                  >
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Carousel({
  slides,
  studySlug,
}: {
  slides: StudyContent["slides"];
  studySlug: string;
}) {
  const [index, setIndex] = useState(0);
  const liveRef = useRef<HTMLDivElement>(null);

  // La navigation dans l'aperçu est le seul signal qui dise si l'extrait de
  // l'étude convainc. Mesurée à la vignette réellement affichée, pas au clic.
  const show = (next: number, method: "arrow" | "dot") => {
    const target = (next + slides.length) % slides.length;
    if (target === index) return;
    setIndex(target);
    trackEvent(
      "study_preview_navigated",
      { study_slug: studySlug, slide_index: target, method, source: "web" },
      true
    );
  };

  const go = (next: number) => show(next, "arrow");

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-[min(384px,100%)]">
        <div
          ref={liveRef}
          aria-live="polite"
          aria-label={`Page ${index + 1} sur ${slides.length}`}
          className="relative aspect-[893/1264] w-full overflow-hidden border border-[#d9d9d9] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.08)]"
        >
          {slides.map((slide, i) => (
            <Image
              key={slide.src + i}
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(max-width: 640px) 90vw, 384px"
              // Toutes les pages sont montées et masquées en opacité : la
              // transition reste fluide et le navigateur n'a rien à recharger.
              className={`object-cover transition-opacity duration-300 ${
                i === index ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={i !== index}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Page précédente"
        className="absolute left-[-12px] top-[42%] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#ddd] bg-white text-xl transition-colors hover:bg-[#f6f4ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b3f9a] sm:left-[-24px]"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Page suivante"
        className="absolute right-[-12px] top-[42%] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#ddd] bg-white text-xl transition-colors hover:bg-[#f6f4ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b3f9a] sm:right-[-24px]"
      >
        ›
      </button>

      <div className="mt-[18px] flex justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={`dot-${slide.src}-${i}`}
            type="button"
            onClick={() => show(i, "dot")}
            aria-label={`Afficher la page ${i + 1}`}
            aria-current={i === index}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i === index ? "bg-[#202020]" : "bg-[#c7c7c7] hover:bg-[#9a9a9a]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- FAQ */

function Faq({ study }: { study: StudyContent }) {
  // Une question déjà comptée ne repart pas : ouvrir et refermer trois fois
  // dit la même chose qu'ouvrir une fois, et gonflerait la mesure pour rien.
  const seen = useRef<Set<number>>(new Set());

  const onToggle = (index: number, question: string) =>
    (event: React.SyntheticEvent<HTMLDetailsElement>) => {
      if (!event.currentTarget.open) return;
      if (seen.current.has(index)) return;
      seen.current.add(index);
      trackEvent(
        "study_faq_opened",
        {
          study_slug: study.slug,
          faq_index: index,
          // Libellé de la question : c'est du contenu éditorial, jamais une
          // donnée personnelle. Tronqué pour ne pas alourdir le dataLayer.
          faq_question: question.slice(0, 120),
          source: "web",
        },
        true
      );
    };

  return (
    <section className="bg-[#f6f4ef] px-0 pb-9 pt-4 lg:pt-0">
      <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
        {/* <details> natif : chaque question s'ouvre et se ferme indépendamment,
            sans état partagé — conforme au brief. */}
        <div className="mx-auto grid max-w-[950px] gap-3.5">
          {study.faq.map((item, index) => (
            <details
              key={item.question}
              onToggle={onToggle(index, item.question)}
              className="rounded-[14px] border border-[#dedede] bg-white px-6 py-5 [&[open]_summary_.chevron]:rotate-180"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-extrabold sm:text-[18px]">
                {item.question}
                <span aria-hidden className="chevron shrink-0 transition-transform duration-200">
                  ⌄
                </span>
              </summary>
              <p className="mt-4 text-[#555]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- Dernier rappel CTA */

function FinalCta({ study, onCta }: { study: StudyContent; onCta: () => void }) {
  return (
    <section className="bg-[#f6f4ef] px-0 pb-[76px] pt-12 text-center">
      <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
        <h2 className="mx-auto mb-6 max-w-[860px] text-[22px] leading-snug sm:text-[28px]">
          {study.finalCtaText}
        </h2>
        <CtaButton onClick={onCta}>{study.ctaLabel}</CtaButton>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Primitives */

function CtaButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[10px] bg-[linear-gradient(135deg,#7b3f9a,#2c4095)] px-6 py-[15px] font-extrabold text-white transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b3f9a] active:brightness-90"
    >
      {children}
    </button>
  );
}
