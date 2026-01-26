// Big Five Bootcamps Data
export interface Trainer {
  id: string;
  name: string;
  title: string;
  bio: string;
  image: string;
  expertise: string[];
}

export interface Session {
  id: string;
  bootcampSlug: string;
  startDate: string;
  endDate: string;
  city: string;
  location: string;
  format: "presentiel" | "hybride" | "online";
  trainer: Trainer;
  spotsTotal: number;
  spotsAvailable: number;
  status: "open" | "full" | "coming-soon";
}

export interface Module {
  title: string;
  duration: string;
  topics: string[];
  exercise?: string;
}

export interface DayProgram {
  day: number;
  title: string;
  modules: Module[];
}

export interface Bootcamp {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  icon: string;
  image: string;
  duration: string;
  durationHours: number;
  level: "debutant" | "intermediaire" | "avance";
  format: "presentiel" | "hybride" | "online";
  price: number;
  currency: string;
  targetAudience: string[];
  prerequisites: string[];
  outcomes: string[];
  challenge: string;
  challengeDescription: string;
  methodology: {
    practiceRatio: number;
    theoryRatio: number;
    approach: string;
    tools: string[];
  };
  program: DayProgram[];
  faq: { question: string; answer: string }[];
  featured: boolean;
  category: string;
}

// Trainers
export const trainers: Trainer[] = [
  {
    id: "trainer-1",
    name: "Aminata Koné",
    title: "Experte Social Media & Stratégie Digitale",
    bio: "Plus de 10 ans d'expérience dans le marketing digital en Afrique de l'Ouest. Ex-Directrice Marketing chez Orange Côte d'Ivoire, elle a piloté des campagnes touchant plus de 5 millions de personnes.",
    image: "/trainers/aminata-kone.jpg",
    expertise: ["Social Media Strategy", "Brand Management", "Digital Marketing", "Analytics"]
  },
  {
    id: "trainer-2",
    name: "Kouadio Yao",
    title: "Expert SEO & Performance Digitale",
    bio: "Consultant SEO reconnu, il a accompagné plus de 50 entreprises africaines dans leur visibilité en ligne. Certifié Google et fondateur de l'agence DigiGrowth.",
    image: "/trainers/kouadio-yao.jpg",
    expertise: ["SEO", "SEA", "Web Analytics", "E-commerce"]
  },
  {
    id: "trainer-3",
    name: "Fatou Diallo",
    title: "Experte Content Marketing & Storytelling",
    bio: "Journaliste devenue content strategist, elle a créé des stratégies de contenu pour des marques panafricaines. Auteure du livre 'Raconter l'Afrique Digitale'.",
    image: "/trainers/fatou-diallo.jpg",
    expertise: ["Content Strategy", "Copywriting", "Storytelling", "Editorial Management"]
  }
];

// Sessions
export const sessions: Session[] = [
  // Social Media Management Sessions
  {
    id: "session-smm-1",
    bootcampSlug: "social-media-management",
    startDate: "2026-03-15",
    endDate: "2026-03-16",
    city: "Abidjan",
    location: "Sofitel Abidjan Hôtel Ivoire",
    format: "presentiel",
    trainer: trainers[0],
    spotsTotal: 20,
    spotsAvailable: 8,
    status: "open"
  },
  {
    id: "session-smm-2",
    bootcampSlug: "social-media-management",
    startDate: "2026-04-12",
    endDate: "2026-04-13",
    city: "Abidjan",
    location: "Radisson Blu Hotel Abidjan",
    format: "presentiel",
    trainer: trainers[0],
    spotsTotal: 20,
    spotsAvailable: 0,
    status: "full"
  },
  {
    id: "session-smm-3",
    bootcampSlug: "social-media-management",
    startDate: "2026-05-24",
    endDate: "2026-05-25",
    city: "Abidjan",
    location: "Big Five Academy",
    format: "hybride",
    trainer: trainers[0],
    spotsTotal: 30,
    spotsAvailable: 25,
    status: "open"
  },
  // SEO Sessions
  {
    id: "session-seo-1",
    bootcampSlug: "seo-referencement",
    startDate: "2026-03-22",
    endDate: "2026-03-23",
    city: "Abidjan",
    location: "Sofitel Abidjan Hôtel Ivoire",
    format: "presentiel",
    trainer: trainers[1],
    spotsTotal: 15,
    spotsAvailable: 5,
    status: "open"
  },
  {
    id: "session-seo-2",
    bootcampSlug: "seo-referencement",
    startDate: "2026-04-26",
    endDate: "2026-04-27",
    city: "Dakar",
    location: "Radisson Blu Dakar Sea Plaza",
    format: "presentiel",
    trainer: trainers[1],
    spotsTotal: 15,
    spotsAvailable: 12,
    status: "open"
  },
  // Content Marketing Sessions
  {
    id: "session-cm-1",
    bootcampSlug: "content-marketing",
    startDate: "2026-04-05",
    endDate: "2026-04-06",
    city: "Abidjan",
    location: "Big Five Academy",
    format: "presentiel",
    trainer: trainers[2],
    spotsTotal: 20,
    spotsAvailable: 14,
    status: "open"
  }
];

// Bootcamps
export const bootcamps: Bootcamp[] = [
  {
    id: "bootcamp-1",
    slug: "social-media-management",
    title: "Social Media Management Avancé",
    tagline: "Passez de gestionnaire à stratège des réseaux sociaux",
    shortDescription: "Maîtrisez les stratégies avancées de gestion des réseaux sociaux et transformez votre présence digitale en résultats concrets.",
    longDescription: "Dans un paysage digital en constante évolution, les professionnels des réseaux sociaux doivent aller au-delà de la simple publication de contenu. Ce bootcamp intensif vous donnera les clés pour développer des stratégies sophistiquées, analyser vos performances avec précision et créer des campagnes qui génèrent un réel impact business.",
    icon: "share-2",
    image: "/bootcamps/social-media.jpg",
    duration: "2 jours",
    durationHours: 14,
    level: "avance",
    format: "presentiel",
    price: 450000,
    currency: "FCFA",
    targetAudience: [
      "Social Media Managers avec 2+ ans d'expérience",
      "Community Managers seniors",
      "Responsables communication digitale",
      "Directeurs marketing souhaitant comprendre les enjeux social media",
      "Entrepreneurs gérant leur propre présence sociale"
    ],
    prerequisites: [
      "Expérience pratique en gestion de réseaux sociaux (minimum 1 an)",
      "Connaissance des principales plateformes (Facebook, Instagram, LinkedIn, TikTok)",
      "Notions de base en marketing digital",
      "Ordinateur portable requis"
    ],
    outcomes: [
      "Élaborer une stratégie social media alignée sur les objectifs business",
      "Maîtriser les outils d'analytics avancés pour optimiser vos performances",
      "Créer des calendriers éditoriaux stratégiques et automatisés",
      "Développer des campagnes paid social performantes",
      "Gérer efficacement les crises sur les réseaux sociaux",
      "Construire et animer une communauté engagée"
    ],
    challenge: "Le défi des réseaux sociaux aujourd'hui",
    challengeDescription: "Les algorithmes changent constamment, l'attention des utilisateurs diminue, et la concurrence pour la visibilité est féroce. Les entreprises qui réussissent sur les réseaux sociaux ne se contentent plus de publier : elles adoptent une approche stratégique, data-driven et centrée sur la création de valeur.",
    methodology: {
      practiceRatio: 70,
      theoryRatio: 30,
      approach: "Notre approche pédagogique est résolument tournée vers la pratique. Vous travaillerez sur des cas réels, utiliserez des outils professionnels et repartirez avec des livrables concrets que vous pourrez immédiatement appliquer.",
      tools: ["Meta Business Suite", "Hootsuite", "Sprout Social", "Canva Pro", "Google Analytics 4", "Notion"]
    },
    program: [
      {
        day: 1,
        title: "Stratégie et Planification Avancée",
        modules: [
          {
            title: "Audit stratégique de présence sociale",
            duration: "2h",
            topics: [
              "Analyse concurrentielle approfondie",
              "Benchmark des meilleures pratiques sectorielles",
              "Identification des opportunités de positionnement"
            ],
            exercise: "Réalisation d'un audit complet de votre présence sociale actuelle"
          },
          {
            title: "Construction d'une stratégie social media",
            duration: "2h30",
            topics: [
              "Définition des objectifs SMART alignés business",
              "Persona et parcours utilisateur sur les réseaux",
              "Choix stratégique des plateformes"
            ],
            exercise: "Élaboration de votre stratégie social media personnalisée"
          },
          {
            title: "Planification éditoriale avancée",
            duration: "2h30",
            topics: [
              "Création de piliers de contenu",
              "Calendrier éditorial stratégique",
              "Outils d'automatisation et de planification"
            ],
            exercise: "Création d'un calendrier éditorial pour le mois suivant"
          }
        ]
      },
      {
        day: 2,
        title: "Analytics, Reporting et Optimisation",
        modules: [
          {
            title: "Analytics et mesure de performance",
            duration: "2h30",
            topics: [
              "KPIs essentiels par plateforme",
              "Configuration des tableaux de bord",
              "Analyse des données et insights actionnables"
            ],
            exercise: "Configuration de votre dashboard de suivi personnalisé"
          },
          {
            title: "Social Ads et campagnes payantes",
            duration: "2h30",
            topics: [
              "Stratégies de ciblage avancées",
              "Optimisation du budget publicitaire",
              "A/B testing et itérations"
            ],
            exercise: "Création d'une campagne publicitaire optimisée"
          },
          {
            title: "Gestion de crise et engagement communautaire",
            duration: "2h",
            topics: [
              "Protocoles de gestion de crise",
              "Techniques d'engagement avancées",
              "Construction d'une communauté fidèle"
            ],
            exercise: "Simulation de gestion de crise en temps réel"
          }
        ]
      }
    ],
    faq: [
      {
        question: "Ce bootcamp est-il adapté aux débutants ?",
        answer: "Ce bootcamp est conçu pour des professionnels ayant déjà une expérience pratique en gestion des réseaux sociaux. Si vous débutez, nous vous recommandons notre formation 'Fondamentaux du Social Media' avant de suivre ce programme avancé."
      },
      {
        question: "Que dois-je apporter ?",
        answer: "Vous devez apporter votre ordinateur portable avec les accès aux comptes sociaux que vous gérez. Nous fournirons les outils et ressources nécessaires pendant la formation."
      },
      {
        question: "Y a-t-il un suivi après la formation ?",
        answer: "Oui ! Vous intégrerez notre communauté alumni Big Five avec accès à un groupe privé, des sessions de Q&A mensuelles et des ressources exclusives pendant 3 mois."
      },
      {
        question: "Puis-je obtenir une facture pour ma entreprise ?",
        answer: "Absolument. Nous fournissons des factures conformes pour les entreprises. Vous pouvez également demander un devis pour un paiement par virement bancaire."
      },
      {
        question: "Quelle est la politique d'annulation ?",
        answer: "Annulation gratuite jusqu'à 14 jours avant la session. Entre 14 et 7 jours : 50% du montant retenu. Moins de 7 jours : aucun remboursement, mais report possible sur une autre session."
      }
    ],
    featured: true,
    category: "Marketing Digital"
  },
  {
    id: "bootcamp-2",
    slug: "seo-referencement",
    title: "SEO & Référencement Naturel",
    tagline: "Dominez les résultats de recherche Google",
    shortDescription: "Apprenez les techniques SEO modernes pour améliorer votre visibilité en ligne et générer du trafic qualifié.",
    longDescription: "Le référencement naturel reste le canal d'acquisition le plus rentable sur le long terme. Ce bootcamp vous donne les compétences techniques et stratégiques pour positionner vos pages en première page de Google et attirer un trafic qualifié de manière durable.",
    icon: "search",
    image: "/bootcamps/seo.jpg",
    duration: "2 jours",
    durationHours: 14,
    level: "intermediaire",
    format: "presentiel",
    price: 400000,
    currency: "FCFA",
    targetAudience: [
      "Responsables marketing digital",
      "Webmasters et développeurs web",
      "Rédacteurs web et content managers",
      "Entrepreneurs souhaitant améliorer leur visibilité",
      "Chargés de communication digitale"
    ],
    prerequisites: [
      "Compréhension basique du fonctionnement d'un site web",
      "Notions de HTML appréciées mais non obligatoires",
      "Accès à un site web ou projet web",
      "Ordinateur portable requis"
    ],
    outcomes: [
      "Réaliser un audit SEO complet de n'importe quel site",
      "Optimiser techniquement un site pour les moteurs de recherche",
      "Développer une stratégie de mots-clés efficace",
      "Créer du contenu optimisé SEO qui ranke",
      "Construire une stratégie de backlinks éthique",
      "Suivre et analyser vos performances SEO"
    ],
    challenge: "Pourquoi le SEO est crucial en 2026",
    challengeDescription: "93% des expériences en ligne commencent par un moteur de recherche. Pourtant, 75% des utilisateurs ne dépassent jamais la première page de résultats. Sans une stratégie SEO solide, votre site reste invisible pour la majorité de vos clients potentiels.",
    methodology: {
      practiceRatio: 65,
      theoryRatio: 35,
      approach: "Formation hands-on avec audit en temps réel de votre propre site. Vous repartirez avec un plan d'action SEO personnalisé et prêt à être implémenté.",
      tools: ["Google Search Console", "Ahrefs", "Screaming Frog", "Surfer SEO", "Google Analytics 4"]
    },
    program: [
      {
        day: 1,
        title: "Fondamentaux et SEO Technique",
        modules: [
          {
            title: "Comprendre le SEO moderne",
            duration: "2h",
            topics: [
              "Fonctionnement des moteurs de recherche",
              "Facteurs de ranking en 2026",
              "SEO vs SEA : complémentarité"
            ]
          },
          {
            title: "Audit et SEO technique",
            duration: "2h30",
            topics: [
              "Audit technique complet",
              "Core Web Vitals et performance",
              "Architecture de site et maillage interne"
            ],
            exercise: "Audit technique de votre site"
          },
          {
            title: "Recherche de mots-clés",
            duration: "2h30",
            topics: [
              "Méthodologie de recherche de mots-clés",
              "Analyse de l'intention de recherche",
              "Stratégie de ciblage sémantique"
            ],
            exercise: "Création de votre liste de mots-clés prioritaires"
          }
        ]
      },
      {
        day: 2,
        title: "Contenu et Off-Page SEO",
        modules: [
          {
            title: "Optimisation on-page",
            duration: "2h30",
            topics: [
              "Rédaction SEO avancée",
              "Structure de contenu optimisée",
              "Optimisation des balises et métadonnées"
            ],
            exercise: "Optimisation d'une page existante"
          },
          {
            title: "Stratégie de liens (Link Building)",
            duration: "2h",
            topics: [
              "Fondamentaux du netlinking",
              "Techniques d'acquisition de liens éthiques",
              "Analyse du profil de liens"
            ]
          },
          {
            title: "Suivi et reporting SEO",
            duration: "2h30",
            topics: [
              "Configuration de Google Search Console",
              "Tableaux de bord de suivi",
              "Plan d'action et priorisation"
            ],
            exercise: "Création de votre plan d'action SEO sur 90 jours"
          }
        ]
      }
    ],
    faq: [
      {
        question: "Faut-il savoir coder pour suivre cette formation ?",
        answer: "Non, aucune compétence en programmation n'est requise. Nous utilisons des outils qui ne nécessitent pas de connaissances techniques avancées."
      },
      {
        question: "Les techniques enseignées sont-elles conformes aux guidelines Google ?",
        answer: "Absolument. Nous enseignons uniquement des techniques 'white hat' approuvées par Google, pour des résultats durables et sans risque de pénalité."
      },
      {
        question: "Combien de temps avant de voir des résultats ?",
        answer: "Le SEO est un investissement à moyen/long terme. Vous pouvez généralement observer les premiers résultats après 3-6 mois d'efforts constants."
      }
    ],
    featured: true,
    category: "Marketing Digital"
  },
  {
    id: "bootcamp-3",
    slug: "content-marketing",
    title: "Content Marketing & Storytelling",
    tagline: "Créez du contenu qui captive et convertit",
    shortDescription: "Maîtrisez l'art du storytelling digital et développez une stratégie de contenu qui engage votre audience.",
    longDescription: "Le contenu est roi, mais seul le bon contenu règne vraiment. Ce bootcamp vous apprend à créer des histoires de marque captivantes, à développer une stratégie de contenu cohérente et à mesurer l'impact de vos efforts content marketing.",
    icon: "pen-tool",
    image: "/bootcamps/content.jpg",
    duration: "2 jours",
    durationHours: 14,
    level: "intermediaire",
    format: "presentiel",
    price: 380000,
    currency: "FCFA",
    targetAudience: [
      "Content managers et rédacteurs web",
      "Responsables communication",
      "Brand managers",
      "Entrepreneurs et créateurs de contenu",
      "Marketeurs souhaitant renforcer leur stratégie de contenu"
    ],
    prerequisites: [
      "Aisance rédactionnelle en français",
      "Connaissance des principaux canaux digitaux",
      "Ordinateur portable requis"
    ],
    outcomes: [
      "Définir une stratégie de contenu alignée sur vos objectifs",
      "Maîtriser les techniques de storytelling de marque",
      "Créer différents formats de contenu engageants",
      "Optimiser votre contenu pour le SEO et les réseaux sociaux",
      "Mesurer la performance de votre stratégie de contenu",
      "Constituer et gérer un calendrier éditorial efficace"
    ],
    challenge: "Le défi du contenu en 2026",
    challengeDescription: "Chaque jour, des millions de contenus sont publiés en ligne. Pour émerger dans ce bruit constant, il ne suffit plus de produire : il faut raconter des histoires qui résonnent, créer de la valeur et bâtir une relation authentique avec votre audience.",
    methodology: {
      practiceRatio: 60,
      theoryRatio: 40,
      approach: "Ateliers d'écriture créative, analyses de cas inspirants et création de contenus en direct. Vous repartirez avec un mini-guide de style pour votre marque.",
      tools: ["Notion", "Grammarly", "Canva", "ChatGPT/Claude", "Hemingway Editor"]
    },
    program: [
      {
        day: 1,
        title: "Stratégie de Contenu & Storytelling",
        modules: [
          {
            title: "Fondamentaux du content marketing",
            duration: "2h",
            topics: [
              "Le content marketing en 2026",
              "Types de contenu et leurs usages",
              "Funnel de contenu et customer journey"
            ]
          },
          {
            title: "L'art du storytelling de marque",
            duration: "2h30",
            topics: [
              "Structure narrative et arc narratif",
              "Trouver la voix de votre marque",
              "Storytelling adapté aux différents canaux"
            ],
            exercise: "Écriture de l'histoire fondatrice de votre marque"
          },
          {
            title: "Définir sa stratégie de contenu",
            duration: "2h30",
            topics: [
              "Audit de contenu existant",
              "Définition des piliers de contenu",
              "Planification et calendrier éditorial"
            ],
            exercise: "Création de vos piliers de contenu"
          }
        ]
      },
      {
        day: 2,
        title: "Création et Distribution",
        modules: [
          {
            title: "Rédaction web efficace",
            duration: "2h30",
            topics: [
              "Techniques de copywriting",
              "Écriture pour le web et le mobile",
              "Titres et accroches percutantes"
            ],
            exercise: "Réécriture d'un article de blog"
          },
          {
            title: "Contenu multiformat",
            duration: "2h",
            topics: [
              "Vidéo, podcast et formats émergents",
              "Repurposing de contenu",
              "User-generated content"
            ]
          },
          {
            title: "Distribution et mesure",
            duration: "2h30",
            topics: [
              "Stratégie de distribution multicanal",
              "KPIs content marketing",
              "Optimisation continue"
            ],
            exercise: "Création de votre tableau de bord content"
          }
        ]
      }
    ],
    faq: [
      {
        question: "Je ne suis pas un 'bon rédacteur', puis-je suivre cette formation ?",
        answer: "Absolument ! Le storytelling et le content marketing sont des compétences qui s'apprennent. Nous vous donnerons les frameworks et techniques pour structurer vos idées efficacement."
      },
      {
        question: "La formation couvre-t-elle l'utilisation de l'IA pour le contenu ?",
        answer: "Oui, nous abordons l'utilisation éthique et efficace des outils d'IA comme assistant à la création de contenu, tout en préservant l'authenticité de votre voix."
      }
    ],
    featured: true,
    category: "Marketing Digital"
  },
  {
    id: "bootcamp-4",
    slug: "google-ads",
    title: "Google Ads Mastery",
    tagline: "Maîtrisez la publicité Google pour générer des leads qualifiés",
    shortDescription: "De la configuration au scaling, apprenez à créer et optimiser des campagnes Google Ads rentables.",
    longDescription: "Google Ads est l'un des leviers d'acquisition les plus puissants quand il est bien maîtrisé. Ce bootcamp vous enseigne à créer des campagnes Search, Display et Shopping qui génèrent un ROI positif.",
    icon: "target",
    image: "/bootcamps/google-ads.jpg",
    duration: "2 jours",
    durationHours: 14,
    level: "intermediaire",
    format: "presentiel",
    price: 420000,
    currency: "FCFA",
    targetAudience: [
      "Responsables acquisition",
      "Growth marketers",
      "Entrepreneurs e-commerce",
      "Agences marketing"
    ],
    prerequisites: [
      "Notions de base en marketing digital",
      "Budget publicitaire disponible pour les exercices",
      "Compte Google Ads actif",
      "Ordinateur portable requis"
    ],
    outcomes: [
      "Structurer des campagnes Google Ads efficaces",
      "Maîtriser les stratégies d'enchères automatisées",
      "Créer des annonces qui convertissent",
      "Optimiser vos campagnes pour le ROI",
      "Analyser et reporter vos performances"
    ],
    challenge: "La complexité de Google Ads",
    challengeDescription: "Avec l'évolution constante de la plateforme et la montée de l'automatisation, il est facile de gaspiller son budget publicitaire. Les annonceurs qui réussissent sont ceux qui comprennent les mécanismes profonds de l'algorithme.",
    methodology: {
      practiceRatio: 75,
      theoryRatio: 25,
      approach: "Formation 100% pratique avec création de campagnes réelles dans votre compte Google Ads.",
      tools: ["Google Ads", "Google Analytics 4", "Google Tag Manager", "Looker Studio"]
    },
    program: [
      {
        day: 1,
        title: "Fondamentaux et Search Ads",
        modules: [
          {
            title: "Maîtriser l'interface Google Ads",
            duration: "2h",
            topics: [
              "Structure de compte optimale",
              "Types de campagnes et objectifs",
              "Paramètres de ciblage"
            ]
          },
          {
            title: "Campagnes Search performantes",
            duration: "3h",
            topics: [
              "Recherche de mots-clés pour le paid",
              "Structure de groupes d'annonces",
              "Rédaction d'annonces RSA"
            ],
            exercise: "Création d'une campagne Search complète"
          },
          {
            title: "Stratégies d'enchères",
            duration: "2h",
            topics: [
              "Enchères manuelles vs automatisées",
              "Maximiser les conversions vs CPA cible",
              "Ajustements d'enchères"
            ]
          }
        ]
      },
      {
        day: 2,
        title: "Display, Performance Max et Optimisation",
        modules: [
          {
            title: "Display et remarketing",
            duration: "2h30",
            topics: [
              "Ciblage Display avancé",
              "Création de visuels efficaces",
              "Stratégies de remarketing"
            ]
          },
          {
            title: "Performance Max",
            duration: "2h",
            topics: [
              "Fonctionnement de PMax",
              "Assets et signaux d'audience",
              "Bonnes pratiques PMax"
            ],
            exercise: "Configuration d'une campagne Performance Max"
          },
          {
            title: "Optimisation et reporting",
            duration: "2h30",
            topics: [
              "Analyse des performances",
              "Techniques d'optimisation",
              "Création de rapports"
            ],
            exercise: "Audit et optimisation de vos campagnes"
          }
        ]
      }
    ],
    faq: [
      {
        question: "Quel budget prévoir pour les exercices ?",
        answer: "Nous recommandons un budget minimum de 50 000 FCFA pour les exercices pratiques durant la formation."
      }
    ],
    featured: false,
    category: "Marketing Digital"
  },
  {
    id: "bootcamp-5",
    slug: "data-analytics",
    title: "Data Analytics pour Marketeurs",
    tagline: "Prenez des décisions basées sur les données",
    shortDescription: "Apprenez à collecter, analyser et interpréter les données marketing pour optimiser vos performances.",
    longDescription: "Dans un monde data-driven, les marketeurs qui savent lire et interpréter les données ont un avantage compétitif majeur. Ce bootcamp vous donne les clés pour transformer vos données en insights actionnables.",
    icon: "bar-chart-3",
    image: "/bootcamps/analytics.jpg",
    duration: "2 jours",
    durationHours: 14,
    level: "intermediaire",
    format: "hybride",
    price: 400000,
    currency: "FCFA",
    targetAudience: [
      "Marketeurs digitaux",
      "Responsables performance",
      "Data analysts juniors",
      "Chefs de projet digital"
    ],
    prerequisites: [
      "Expérience en marketing digital",
      "Connaissance de base d'Excel/Google Sheets",
      "Ordinateur portable requis"
    ],
    outcomes: [
      "Configurer Google Analytics 4 correctement",
      "Créer des tableaux de bord marketing",
      "Analyser le parcours client",
      "Identifier les opportunités d'optimisation",
      "Présenter des insights de manière convaincante"
    ],
    challenge: "Le défi des données marketing",
    challengeDescription: "Les données sont partout, mais peu de marketeurs savent vraiment les exploiter. Entre les dashboards incomplets, les métriques vaniteuses et les silos de données, il est difficile d'avoir une vision claire de sa performance.",
    methodology: {
      practiceRatio: 70,
      theoryRatio: 30,
      approach: "Formation hands-on avec vos propres données. Vous repartirez avec des tableaux de bord configurés et opérationnels.",
      tools: ["Google Analytics 4", "Looker Studio", "Google Sheets", "BigQuery basics"]
    },
    program: [
      {
        day: 1,
        title: "Collecte et Configuration",
        modules: [
          {
            title: "Fondamentaux de l'analytics",
            duration: "2h",
            topics: [
              "Métriques vs dimensions",
              "Attribution et modèles",
              "Privacy et tracking en 2026"
            ]
          },
          {
            title: "Google Analytics 4 en profondeur",
            duration: "3h",
            topics: [
              "Configuration avancée GA4",
              "Events et conversions",
              "Audiences et segments"
            ],
            exercise: "Audit et optimisation de votre GA4"
          },
          {
            title: "Tracking avancé",
            duration: "2h",
            topics: [
              "Google Tag Manager essentials",
              "Tracking des conversions",
              "Data quality"
            ]
          }
        ]
      },
      {
        day: 2,
        title: "Analyse et Visualisation",
        modules: [
          {
            title: "Analyse exploratoire",
            duration: "2h30",
            topics: [
              "Explorations GA4",
              "Funnel analysis",
              "Path analysis"
            ],
            exercise: "Analyse de votre funnel de conversion"
          },
          {
            title: "Création de dashboards",
            duration: "2h30",
            topics: [
              "Looker Studio essentials",
              "Visualisation efficace",
              "Dashboards automatisés"
            ],
            exercise: "Création de votre dashboard marketing"
          },
          {
            title: "De l'analyse à l'action",
            duration: "2h",
            topics: [
              "Transformer les data en insights",
              "Présenter ses analyses",
              "Culture data en entreprise"
            ]
          }
        ]
      }
    ],
    faq: [
      {
        question: "Faut-il être bon en maths ?",
        answer: "Non, ce bootcamp est conçu pour des profils marketing. Nous utilisons des outils visuels et des méthodes accessibles."
      }
    ],
    featured: false,
    category: "Data & Analytics"
  }
];

// Helper functions
export function getBootcampBySlug(slug: string): Bootcamp | undefined {
  return bootcamps.find(b => b.slug === slug);
}

export function getSessionsByBootcamp(bootcampSlug: string): Session[] {
  return sessions.filter(s => s.bootcampSlug === bootcampSlug);
}

export function getSessionById(sessionId: string): Session | undefined {
  return sessions.find(s => s.id === sessionId);
}

export function getFeaturedBootcamps(): Bootcamp[] {
  return bootcamps.filter(b => b.featured);
}

export function getBootcampsByCategory(category: string): Bootcamp[] {
  return bootcamps.filter(b => b.category === category);
}

export function formatPrice(price: number, currency: string = "FCFA"): string {
  return new Intl.NumberFormat('fr-FR').format(price) + ' ' + currency;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = start.toLocaleDateString('fr-FR', { month: 'long' });
  const year = start.getFullYear();
  return `${startDay}-${endDay} ${month} ${year}`;
}
