"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics";

/** Empêche qu'un rechargement de cette page compte un second téléchargement. */
const STORAGE_PREFIX = "laveiye-guide-download:";

/**
 * Marge laissée à la balise GA4 du conteneur avant de rendre la main.
 *
 * L'écriture Supabase est protégée par `keepalive` et survivrait à un
 * déchargement ; la balise GTM, elle, part de façon asynchrone après lecture du
 * dataLayer. Dans le cas nominal la page ne se décharge même pas — la réponse
 * est un `Content-Disposition: attachment`, que le navigateur télécharge sans
 * quitter la page. Mais sur le chemin d'erreur (fichier absent, jeton expiré),
 * l'API répond du JSON et la page part : cette marge évite d'y perdre la
 * mesure. Un demi-tour de seconde sur une page qui annonce déjà une attente.
 */
const REDIRECT_DELAY_MS = 500;

/**
 * Émet `guide_download`, puis passe la main à l'API qui sert le fichier.
 *
 * L'événement part AVANT la redirection : c'est le seul ordre qui garantisse
 * qu'il parte. `trackEvent` ne lève jamais et n'est pas attendu.
 */
export function DownloadRelay({
  token,
  guideId,
}: {
  token: string;
  guideId: string | null;
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const key = `${STORAGE_PREFIX}${token}`;
    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      /* stockage indisponible : mieux vaut mesurer deux fois que zéro */
    }

    // Sans `guideId`, la résolution du jeton a échoué : on relaie quand même —
    // le fichier prime — mais on ne mesure pas un téléchargement dont on ne
    // sait pas de quelle étude il parle.
    if (!alreadyCounted && guideId) {
      // `study_slug` devient `guide_id` par la table de renommage
      // (lib/datalayer.ts) : les deux paramètres du brief §6 sont servis.
      trackEvent(
        "study_download",
        { study_slug: guideId, source_context: "email_link", source: "web" },
        true
      );
    }

    // `replace` et non `assign` : le retour arrière ne doit pas relancer le
    // téléchargement en boucle.
    const timer = window.setTimeout(() => {
      window.location.replace(`/api/etudes/download?token=${encodeURIComponent(token)}`);
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [token, guideId]);

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-center">
      <div className="max-w-md">
        <h1 className="mb-3 font-serif text-2xl text-[#171717]">
          Votre téléchargement démarre…
        </h1>
        <p className="text-[#555]">
          Si rien ne se passe,{" "}
          <a
            className="font-semibold text-[#7b3f9a] underline"
            href={`/api/etudes/download?token=${encodeURIComponent(token)}`}
          >
            cliquez ici pour télécharger l’étude
          </a>
          .
        </p>
      </div>
    </main>
  );
}
