import type { Metadata } from "next";
import KeynoteClient from "./keynote-client";

/**
 * Événement passé du 21 mai 2026. La page est retirée du sitemap et
 * passée en noindex (lib/seo/robots-policy.ts) : un événement révolu
 * mis en avant fait vieillir tout le site. À rouvrir en page de replay
 * si un enregistrement est publié.
 */
export const metadata: Metadata = {
  title: "LAVEIYE — Keynote de lancement · 21 mai 2026",
  description:
    "Réservez votre place pour le keynote de lancement de LAVEIYE, la première bibliothèque créative social media dédiée à l'Afrique francophone.",
  alternates: { canonical: "/keynote" },
};

export default function KeynotePage() {
  return <KeynoteClient />;
}
