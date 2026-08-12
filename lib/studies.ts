/**
 * Contenu éditorial des landings d'étude (/etudes/[slug]).
 *
 * Les métadonnées mouvantes (titre, sous-titre, fichier, activation) vivent en
 * base dans `studies` ; ce fichier porte le contenu de page — visuels, bénéfices,
 * FAQ — qui change à chaque nouveau tome et se relit mieux dans le code que
 * dans une table.
 */

export interface StudySlide {
  src: string
  alt: string
}

export interface StudyFaqItem {
  question: string
  answer: string
}

export interface StudyContent {
  slug: string
  eyebrow: string
  title: string
  subtitle: string
  description: string
  ctaLabel: string
  /** Couverture, présentée en mockup livre dans le hero. */
  cover: StudySlide
  /** Pages réelles affichées dans le carrousel de prévisualisation. */
  slides: StudySlide[]
  benefitsTitle: string
  benefits: string[]
  faq: StudyFaqItem[]
  finalCtaText: string
  /** Description SEO — sert aussi à l'aperçu Open Graph. */
  metaDescription: string
}

const FINANCE: StudyContent = {
  slug: 'finance',
  eyebrow: 'Étude',
  title: 'Comment les marques en Afrique francophone communiquent ?',
  subtitle: 'Tome 1 : Finance',
  description:
    'Accédez au guide pour découvrir une lecture stratégique des tendances créatives, des axes de communication et des contenus utilisés par les marques du secteur de la finance sur le digital.',
  ctaLabel: "Télécharger l'étude",
  cover: {
    src: '/etudes/finance/couverture.webp',
    alt: "Couverture de l'étude — Tome 1 : Finance",
  },
  slides: [
    { src: '/etudes/finance/couverture.webp', alt: "Couverture de l'étude" },
    { src: '/etudes/finance/preambule.webp', alt: "Page Préambule de l'étude" },
    { src: '/etudes/finance/sommaire.webp', alt: 'Page Sommaire du guide' },
    { src: '/etudes/finance/contenu-uba.webp', alt: "Page d'analyse Contenu 4 — UBA" },
  ],
  benefitsTitle: 'Avec ce guide, vous allez pouvoir :',
  benefits: [
    'Identifier les angles de communication qui reviennent le plus dans le secteur financier.',
    'Repérer des idées exploitables pour vos prochaines campagnes.',
    'Gagner du temps dans votre veille et vos benchmarks.',
    'Détecter les opportunités encore peu exploitées par vos concurrents.',
    'Améliorer vos briefs créatifs et vos recommandations marketing.',
  ],
  faq: [
    {
      question: 'Pourquoi dois-je fournir les informations demandées ?',
      answer: 'Ces informations permettent de vous transmettre l’étude.',
    },
    {
      question: 'Ce contenu est-il vraiment gratuit ?',
      answer:
        'Oui. L’étude est mise à disposition gratuitement après validation du formulaire. Aucun paiement n’est demandé.',
    },
  ],
  finalCtaText:
    'Découvrez les tendances, les axes de communication et les contenus qui structurent la communication digitale des marques financières.',
  metaDescription:
    'Étude Big Five × Laveiye — Tome 1 : Finance. Tendances créatives, axes de communication et contenus des marques financières en Afrique francophone. Téléchargement gratuit.',
}

const STUDIES: Record<string, StudyContent> = {
  finance: FINANCE,
}

export function getStudyContent(slug: string): StudyContent | null {
  return STUDIES[slug] || null
}

export function getStudySlugs(): string[] {
  return Object.keys(STUDIES)
}
