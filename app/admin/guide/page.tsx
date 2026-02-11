"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LogIn,
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Tag,
  Image,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Se connecter a l'administration",
    icon: LogIn,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    content: [
      "Rendez-vous sur la page /admin/login",
      "Entrez votre email : jeffrey@bigfive.com",
      "Entrez votre mot de passe : admin2014!k",
      "Cliquez sur \"Se connecter\"",
      "Vous serez redirige vers le tableau de bord",
    ],
  },
  {
    id: 2,
    title: "Acceder a la gestion des campagnes",
    icon: Megaphone,
    color: "text-[#FF6B35]",
    bgColor: "bg-[#FF6B35]/20",
    content: [
      "Dans le menu lateral gauche, cliquez sur \"Campagnes\"",
      "La page affiche la liste de toutes les campagnes existantes",
      "Chaque campagne montre : image, titre, marque, agence, secteur, pays, plateforme, format et tags",
    ],
  },
  {
    id: 3,
    title: "Ajouter une nouvelle campagne",
    icon: Plus,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    content: [
      "Cliquez sur le bouton orange \"Ajouter une campagne\" en haut a droite",
      "Remplissez le formulaire avec les informations suivantes :",
      "  - Titre (obligatoire) : le nom de la campagne",
      "  - Description : une description detaillee de la campagne",
      "  - Marque : le nom de la marque (ex: MTN, Orange, Coca-Cola)",
      "  - Agence : le nom de l'agence (ex: Ogilvy Africa, McCann)",
      "  - URL de l'image : un lien vers l'image de la campagne",
      "  - Plateforme : Facebook, Instagram, TikTok, YouTube, LinkedIn ou Twitter/X",
      "  - Pays : le pays concerne",
      "  - Secteur : Telecoms, E-commerce, Banque/Finance, FMCG, Tech, Energie ou Industrie",
      "  - Format : Video Ad, Story, Carousel, Post Social ou Campagne 360",
      "  - Date : le mois et l'annee (ex: Jan 2024)",
      "  - Annee : l'annee de la campagne",
      "  - Video : cochez si la campagne contient une video",
      "  - Tags : ajoutez des mots-cles en tapant et en appuyant sur Entree",
      "Cliquez sur \"Ajouter\" pour sauvegarder",
    ],
  },
  {
    id: 4,
    title: "Modifier une campagne existante",
    icon: Edit,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    content: [
      "Sur la liste des campagnes, trouvez celle que vous souhaitez modifier",
      "Cliquez sur l'icone de menu (trois points verticaux) a droite de la campagne",
      "Selectionnez \"Modifier\"",
      "Le formulaire s'ouvre avec les informations actuelles pre-remplies",
      "Modifiez les champs souhaites",
      "Cliquez sur \"Enregistrer\" pour sauvegarder les modifications",
    ],
  },
  {
    id: 5,
    title: "Previsualiser une campagne",
    icon: Eye,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    content: [
      "Cliquez sur l'icone de menu (trois points verticaux) a droite de la campagne",
      "Selectionnez \"Apercu\"",
      "Une fenetre s'ouvre avec tous les details de la campagne",
      "Vous pouvez voir l'image, la description, et toutes les informations",
    ],
  },
  {
    id: 6,
    title: "Supprimer une campagne",
    icon: Trash2,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    content: [
      "Cliquez sur l'icone de menu (trois points verticaux) a droite de la campagne",
      "Selectionnez \"Supprimer\" (en rouge)",
      "La campagne sera immediatement supprimee",
      "Attention : cette action est irreversible",
    ],
  },
  {
    id: 7,
    title: "Rechercher et filtrer les campagnes",
    icon: Search,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    content: [
      "Utilisez la barre de recherche pour trouver une campagne par titre, marque ou agence",
      "Utilisez le filtre par secteur pour afficher uniquement les campagnes d'un secteur specifique",
      "Les filtres se combinent pour affiner vos resultats",
    ],
  },
];

const tips = [
  {
    icon: Image,
    title: "Images",
    description:
      "Utilisez des URLs d'images Unsplash pour de belles illustrations. Format recommande : 800x450 pixels. Exemple : https://images.unsplash.com/photo-XXXXX?w=800&h=450&fit=crop",
  },
  {
    icon: Tag,
    title: "Tags",
    description:
      "Ajoutez des tags pertinents pour faciliter le filtrage. Exemples : Viral, Humour, Culture, Fintech, Storytelling, RSE, Innovation",
  },
  {
    icon: Filter,
    title: "Secteurs disponibles",
    description:
      "Telecoms, E-commerce, Banque/Finance, FMCG (Grande consommation), Tech, Energie, Industrie",
  },
];

export default function GuidePage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-[family-name:var(--font-heading)]">
          Guide d&apos;utilisation
        </h1>
        <p className="text-gray-600 mt-1">
          Comment mettre à jour les exemples de campagnes et formations sur la plateforme
        </p>
      </div>

      {/* Quick Info Card */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-[#FF6B35]" />
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold mb-1">Informations de connexion</h3>
              <p className="text-gray-600 text-sm">
                <strong className="text-gray-900">Email :</strong> jeffrey@bigfive.com
                <br />
                <strong className="text-gray-900">Mot de passe :</strong> admin2014!k
                <br />
                <strong className="text-gray-900">URL :</strong> /admin/login
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 font-[family-name:var(--font-heading)]">
          Étapes détaillées
        </h2>
        {steps.map((step) => (
          <Card key={step.id} className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <div className={`w-10 h-10 rounded-lg ${step.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <step.icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Étape {step.id}
                  </span>
                  <span className="text-base">{step.title}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pl-[4.5rem]">
              <ul className="space-y-2">
                {step.content.map((line, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    {line.startsWith("  -") ? (
                      <>
                        <span className="text-[#FF6B35] mt-0.5 ml-4">-</span>
                        <span>{line.replace("  - ", "")}</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-3 w-3 mt-1 text-[#FF6B35] flex-shrink-0" />
                        <span>{line}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-heading)]">
          Conseils pratiques
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {tips.map((tip) => (
            <Card key={tip.title} className="bg-[#122a52] border-[#1a3a6e]">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-[#1a3a6e] flex items-center justify-center mb-3">
                  <tip.icon className="h-5 w-5 text-[#FF6B35]" />
                </div>
                <h3 className="text-white font-medium mb-2">{tip.title}</h3>
                <p className="text-[#9CA3AF] text-sm">{tip.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Structure Explanation */}
      <Card className="bg-[#122a52] border-[#1a3a6e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Structure d&apos;une campagne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a3a6e]">
                  <th className="text-left py-3 pr-4 text-[#9CA3AF] font-medium">Champ</th>
                  <th className="text-left py-3 pr-4 text-[#9CA3AF] font-medium">Obligatoire</th>
                  <th className="text-left py-3 text-[#9CA3AF] font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-[#9CA3AF]">
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Titre</td>
                  <td className="py-2.5 pr-4 text-green-400">Oui</td>
                  <td className="py-2.5">Nom complet de la campagne</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Description</td>
                  <td className="py-2.5 pr-4">Non</td>
                  <td className="py-2.5">Description detaillee de la campagne</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Marque</td>
                  <td className="py-2.5 pr-4">Non</td>
                  <td className="py-2.5">Nom de la marque annonceur</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Agence</td>
                  <td className="py-2.5 pr-4">Non</td>
                  <td className="py-2.5">Nom de l&apos;agence de communication</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Image URL</td>
                  <td className="py-2.5 pr-4">Non</td>
                  <td className="py-2.5">Lien vers l&apos;image illustrative</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Plateforme</td>
                  <td className="py-2.5 pr-4 text-green-400">Oui</td>
                  <td className="py-2.5">Reseau social principal</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Pays</td>
                  <td className="py-2.5 pr-4 text-green-400">Oui</td>
                  <td className="py-2.5">Pays de diffusion</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Secteur</td>
                  <td className="py-2.5 pr-4 text-green-400">Oui</td>
                  <td className="py-2.5">Secteur d&apos;activite</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Format</td>
                  <td className="py-2.5 pr-4 text-green-400">Oui</td>
                  <td className="py-2.5">Type de contenu publicitaire</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Date</td>
                  <td className="py-2.5 pr-4">Non</td>
                  <td className="py-2.5">Mois et annee de publication</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Annee</td>
                  <td className="py-2.5 pr-4">Non</td>
                  <td className="py-2.5">Annee de la campagne</td>
                </tr>
                <tr className="border-b border-[#1a3a6e]/50">
                  <td className="py-2.5 pr-4 text-white">Video</td>
                  <td className="py-2.5 pr-4">Non</td>
                  <td className="py-2.5">Indique si la campagne inclut une video</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-white">Tags</td>
                  <td className="py-2.5 pr-4">Non</td>
                  <td className="py-2.5">Mots-cles pour le filtrage</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
