"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Scale } from "lucide-react";
import { useProductPrice } from "@/hooks/use-product-price";

interface LegalModalProps {
  trigger?: React.ReactNode;
  defaultTab?: "cgu" | "cgv" | "privacy";
}

export function LegalModal({ trigger, defaultTab = "cgu" }: LegalModalProps) {
  const { label: priceLabel, currency: priceCurrency } = useProductPrice();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="text-primary hover:underline text-sm">
            Voir les conditions
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            Informations légales
          </DialogTitle>
          <DialogDescription>
            Conditions d&apos;utilisation, conditions de vente et politique de confidentialité
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 px-6">
            <TabsTrigger value="cgu" className="gap-2">
              <FileText className="h-4 w-4" />
              CGU
            </TabsTrigger>
            <TabsTrigger value="cgv" className="gap-2">
              <Scale className="h-4 w-4" />
              CGV
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              Confidentialité
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(85vh-180px)] px-6 pb-6">
            {/* CGU - Conditions Générales d'Utilisation */}
            <TabsContent value="cgu" className="mt-4">
              <div className="prose prose-slate max-w-none">
                <p className="text-sm text-muted-foreground mb-6">
                  Dernière mise à jour : 22 Janvier 2026
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">1. Introduction</h3>
                <p className="text-sm leading-relaxed">
                  Bienvenue sur Big Five Creative Library. En accédant à notre site web et en 
                  utilisant nos services, vous acceptez d&apos;être lié par ces Conditions Générales 
                  d&apos;Utilisation (CGU), toutes les lois et réglementations applicables, et vous 
                  acceptez d&apos;être responsable du respect des lois locales applicables.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">2. Licence d&apos;utilisation</h3>
                <p className="text-sm leading-relaxed">
                  Il est permis de télécharger temporairement une copie des documents (informations 
                  ou logiciels) sur le site web de Big Five Creative Library à des fins de visionnage 
                  transitoire personnel et non commercial uniquement. Il s&apos;agit de l&apos;octroi d&apos;une 
                  licence, et non d&apos;un transfert de titre.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">3. Utilisation acceptable</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Vous vous engagez à ne pas :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Utiliser le service à des fins illégales ou non autorisées</li>
                  <li>Violer les droits de propriété intellectuelle de tiers</li>
                  <li>Transmettre des virus ou codes malveillants</li>
                  <li>Tenter d&apos;accéder de manière non autorisée à nos systèmes</li>
                  <li>Partager votre compte avec des tiers</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">4. Compte utilisateur</h3>
                <p className="text-sm leading-relaxed">
                  Vous êtes responsable de maintenir la confidentialité de votre compte et de votre 
                  mot de passe. Vous acceptez d&apos;assumer la responsabilité de toutes les activités 
                  qui se produisent sous votre compte.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">5. Propriété intellectuelle</h3>
                <p className="text-sm leading-relaxed">
                  Tout le contenu disponible sur Big Five Creative Library, y compris mais sans s&apos;y 
                  limiter les textes, graphiques, logos, images, vidéos et logiciels, est la propriété 
                  de Big Five Creative Library ou de ses fournisseurs de contenu et est protégé par 
                  les lois sur la propriété intellectuelle.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">6. Clause de non-responsabilité</h3>
                <p className="text-sm leading-relaxed">
                  Les documents figurant sur le site web de Big Five Creative Library sont fournis 
                  &quot;tels quels&quot;. Big Five Creative Library ne donne aucune garantie, expresse ou implicite, 
                  et rejette et nie par la présente toutes les autres garanties, y compris, sans 
                  limitation, les garanties ou conditions implicites de qualité marchande, d&apos;adéquation 
                  à un usage particulier, ou de non-violation de la propriété intellectuelle.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">7. Limitations</h3>
                <p className="text-sm leading-relaxed">
                  En aucun cas, Big Five Creative Library ou ses fournisseurs ne pourront être tenus 
                  responsables de tout dommage (y compris, sans limitation, les dommages pour perte 
                  de données ou de profit, ou en raison d&apos;une interruption d&apos;activité) découlant de 
                  l&apos;utilisation ou de l&apos;incapacité d&apos;utiliser les documents sur le site web.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">8. Modifications des conditions</h3>
                <p className="text-sm leading-relaxed">
                  Big Five Creative Library se réserve le droit de modifier ces conditions à tout 
                  moment. Nous vous informerons de tout changement en publiant les nouvelles conditions 
                  sur cette page. Il est de votre responsabilité de consulter régulièrement ces conditions.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">9. Résiliation</h3>
                <p className="text-sm leading-relaxed">
                  Nous pouvons résilier ou suspendre votre compte et interdire l&apos;accès au service 
                  immédiatement, sans préavis ni responsabilité, pour quelque raison que ce soit, y 
                  compris sans limitation si vous enfreignez les Conditions.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">10. Loi applicable</h3>
                <p className="text-sm leading-relaxed">
                  Ces Conditions sont régies et interprétées conformément aux lois en vigueur, et vous 
                  vous soumettez irrévocablement à la juridiction exclusive des tribunaux compétents.
                </p>
              </div>
            </TabsContent>

            {/* CGV - Conditions Générales de Vente */}
            <TabsContent value="cgv" className="mt-4">
              <div className="prose prose-slate max-w-none">
                <p className="text-sm text-muted-foreground mb-6">
                  Dernière mise à jour : 22 Janvier 2026
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">1. Objet</h3>
                <p className="text-sm leading-relaxed">
                  Les présentes Conditions Générales de Vente (CGV) régissent les relations 
                  contractuelles entre Big Five Creative Library et ses clients concernant la vente 
                  d&apos;abonnements et de services sur la plateforme.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">2. Prix et tarification</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Les prix de nos services sont indiqués en FCFA (Franc CFA) et peuvent inclure :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>Plan Gratuit (Free) :</strong> 0 FCFA - Accès limité aux contenus de base</li>
                  <li><strong>Plan Pro :</strong> 15 000 FCFA/mois - Accès complet aux contenus premium</li>
                  <li><strong>Plan Premium :</strong> {priceLabel} {priceCurrency}/mois - Tous les avantages Pro + support prioritaire</li>
                </ul>
                <p className="text-sm leading-relaxed mt-2">
                  Les prix peuvent être modifiés à tout moment, mais les abonnements en cours 
                  conservent leur tarif jusqu&apos;au renouvellement.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">3. Modalités de paiement</h3>
                <p className="text-sm leading-relaxed">
                  Les paiements sont acceptés via Mobile Money (Orange Money, MTN Mobile Money, Moov 
                  Money) et carte bancaire. Les paiements sont traités de manière sécurisée via notre 
                  partenaire Chariow. Tous les paiements sont finalisés au moment de l&apos;achat.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">4. Abonnements et renouvellement</h3>
                <p className="text-sm leading-relaxed">
                  Les abonnements sont renouvelés automatiquement chaque mois à moins que vous 
                  n&apos;annuliez votre abonnement avant la date de renouvellement. Vous recevrez un 
                  rappel par email 7 jours avant le renouvellement.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">5. Droit de rétractation</h3>
                <p className="text-sm leading-relaxed">
                  Conformément à la réglementation, vous disposez d&apos;un délai de 7 jours à compter 
                  de votre achat pour exercer votre droit de rétractation, sous réserve de ne pas 
                  avoir consommé le service de manière significative.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">6. Remboursements</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Les remboursements peuvent être accordés dans les cas suivants :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Problème technique empêchant l&apos;accès au service</li>
                  <li>Double facturation</li>
                  <li>Service non conforme à la description</li>
                </ul>
                <p className="text-sm leading-relaxed mt-2">
                  Les demandes de remboursement doivent être envoyées à support@bigfive.com dans 
                  les 7 jours suivant l&apos;achat.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">7. Livraison du service</h3>
                <p className="text-sm leading-relaxed">
                  L&apos;accès aux services est instantané dès la confirmation du paiement. Vous recevrez 
                  un email de confirmation avec les détails de votre abonnement.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">8. Annulation et suspension</h3>
                <p className="text-sm leading-relaxed">
                  Vous pouvez annuler votre abonnement à tout moment depuis votre espace personnel. 
                  L&apos;annulation prend effet à la fin de la période de facturation en cours. En cas de 
                  violation des CGU, nous nous réservons le droit de suspendre ou résilier votre accès.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">9. Facturation</h3>
                <p className="text-sm leading-relaxed">
                  Une facture électronique est automatiquement générée et envoyée à votre adresse 
                  email après chaque paiement. Ces factures sont également accessibles dans votre 
                  espace personnel.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">10. Service client</h3>
                <p className="text-sm leading-relaxed">
                  Pour toute question concernant votre abonnement ou facturation, contactez-nous à 
                  support@bigfive.com ou via le formulaire de contact disponible sur le site.
                </p>
              </div>
            </TabsContent>

            {/* Politique de confidentialité */}
            <TabsContent value="privacy" className="mt-4">
              <div className="prose prose-slate max-w-none">
                <p className="text-sm text-muted-foreground mb-6">
                  Dernière mise à jour : 22 Janvier 2026
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">1. Introduction</h3>
                <p className="text-sm leading-relaxed">
                  Votre vie privée est importante pour nous. Cette Politique de Confidentialité 
                  explique comment Big Five Creative Library collecte, utilise, divulgue et protège 
                  vos informations personnelles lorsque vous utilisez notre plateforme.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">2. Informations que nous collectons</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Nous collectons plusieurs types d&apos;informations :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>Informations d&apos;identification :</strong> nom, prénom, adresse email</li>
                  <li><strong>Informations de paiement :</strong> coordonnées de paiement (traitées de manière sécurisée par Chariow)</li>
                  <li><strong>Informations d&apos;utilisation :</strong> pages visitées, contenus consultés, temps passé</li>
                  <li><strong>Informations techniques :</strong> adresse IP, type de navigateur, système d&apos;exploitation</li>
                  <li><strong>Cookies et technologies similaires :</strong> pour améliorer votre expérience</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">3. Comment nous utilisons vos informations</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Nous utilisons vos informations pour :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Fournir et maintenir nos services</li>
                  <li>Traiter vos paiements et gérer vos abonnements</li>
                  <li>Vous envoyer des notifications importantes</li>
                  <li>Améliorer et personnaliser votre expérience</li>
                  <li>Analyser l&apos;utilisation de la plateforme</li>
                  <li>Détecter et prévenir la fraude</li>
                  <li>Respecter nos obligations légales</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">4. Partage de vos informations</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Nous ne vendons jamais vos informations personnelles. Nous pouvons partager vos 
                  informations avec :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>Prestataires de services :</strong> Chariow (paiements), Supabase (hébergement données)</li>
                  <li><strong>Partenaires commerciaux :</strong> uniquement avec votre consentement explicite</li>
                  <li><strong>Autorités légales :</strong> si requis par la loi</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">5. Sécurité des données</h3>
                <p className="text-sm leading-relaxed">
                  Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour 
                  protéger vos données contre l&apos;accès non autorisé, la modification, la divulgation ou 
                  la destruction. Cela inclut le chiffrement SSL/TLS, l&apos;authentification sécurisée et 
                  des contrôles d&apos;accès stricts.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">6. Conservation des données</h3>
                <p className="text-sm leading-relaxed">
                  Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir 
                  nos services et respecter nos obligations légales. Les données de compte inactif 
                  depuis plus de 2 ans peuvent être supprimées après notification.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">7. Vos droits</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Vous disposez des droits suivants concernant vos données personnelles :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
                  <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                  <li><strong>Droit à l&apos;effacement :</strong> supprimer vos données (&quot;droit à l&apos;oubli&quot;)</li>
                  <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</li>
                  <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                  <li><strong>Droit de retrait du consentement :</strong> retirer votre consentement à tout moment</li>
                </ul>
                <p className="text-sm leading-relaxed mt-2">
                  Pour exercer ces droits, contactez-nous à privacy@bigfive.com
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">8. Cookies</h3>
                <p className="text-sm leading-relaxed">
                  Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez contrôler 
                  les cookies via les paramètres de votre navigateur. Notez que désactiver certains 
                  cookies peut affecter la fonctionnalité du site.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">9. Transferts internationaux</h3>
                <p className="text-sm leading-relaxed">
                  Vos données peuvent être transférées et stockées sur des serveurs situés en dehors 
                  de votre pays. Nous nous assurons que ces transferts respectent les normes de 
                  protection des données applicables.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">10. Modifications de cette politique</h3>
                <p className="text-sm leading-relaxed">
                  Nous pouvons mettre à jour cette Politique de Confidentialité de temps en temps. 
                  Nous vous informerons de tout changement important en publiant la nouvelle politique 
                  sur cette page et en vous envoyant un email.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">11. Contact</h3>
                <p className="text-sm leading-relaxed">
                  Pour toute question concernant cette Politique de Confidentialité, contactez-nous :
                </p>
                <ul className="list-none pl-0 space-y-1 text-sm mt-2">
                  <li>Email : privacy@bigfive.com</li>
                  <li>Téléphone : +225 XX XX XX XX XX</li>
                  <li>Adresse : Big Five Creative Library, Abidjan, Côte d&apos;Ivoire</li>
                </ul>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
