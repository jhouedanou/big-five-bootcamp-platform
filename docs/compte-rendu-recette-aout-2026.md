# Compte rendu de recette — brouillon d'e-mail

> **À relire et à envoyer par tes soins.** Rien n'a été envoyé depuis la session.
> Destinataires suggérés : Franck et Cossi (ils ont ouvert les lignes KO), en
> copie l'équipe projet. À confirmer avant envoi.

---

**Objet :** Correctifs des points KO du 18 et 19 août — prêts pour recette

Bonjour à tous les deux,

Les huit points KO de la grille sont corrigés et poussés sur la branche de
préproduction. Voici ce qui change, point par point, et ce qu'il reste à faire
de votre côté.

## Ce qui est corrigé

**La bannière de l'étude est enfin lisible.** Un visuel qui porte déjà son
texte et son bouton était rogné de moitié et recouvert d'un dégradé. Il y a
maintenant un choix dans `/admin/bannieres` : « Bannière éditoriale » pour un
texte saisi dans le formulaire, ou « Visuel complet » pour un visuel de
graphiste, affiché entier et sans rien par-dessus. Format conseillé :
1200 × 375 px.

**Une vidéo téléversée est reconnue partout.** Elle sortait « non reconnue » à
tous les étages : pas d'aperçu dans l'admin, pas de vignette, et un lecteur qui
annonçait ne pas pouvoir l'afficher. C'est réglé, et la vignette est maintenant
capturée automatiquement dans la vidéo — plus de capture d'écran à faire.

**Le format des vidéos verticales est respecté.** Un Reel Instagram ou Facebook
partait en format paysage et se retrouvait coupé. Le lecteur s'adapte désormais
à la vidéo réelle.

**Plus de « Voir la vidéo Facebook » sur un post Instagram.** Le libellé venait
de la plateforme déclarée sur la campagne, le lecteur suivait l'URL : les deux
pouvaient se contredire. Le libellé suit désormais l'URL.

**Les vignettes Google Drive s'affichent** (à condition que le fichier soit
partagé « toute personne disposant du lien »).

**« S'en inspirer dans le studio » est visible depuis la fiche.** Le bouton
n'existait que sur mobile — sur ordinateur, il n'y avait rien. Il est aussi
visible pour les comptes sans abonnement, qui sont renvoyés vers l'offre : le
masquer laissait croire que la fonctionnalité n'existait pas.

**Le studio accepte les créas de la bibliothèque.** En plus du téléversement
depuis le bureau, un bouton « Choisir dans la bibliothèque » avec recherche.

**Le pixel Meta est enfin détectable.** La cause était inattendue : le bandeau
de consentement n'était affiché que sur la page d'accueil. Quelqu'un qui
arrivait d'une publicité directement sur la page de l'étude ne pouvait jamais
accepter les cookies — donc le pixel n'était jamais chargé, et Test Events
n'avait littéralement rien à voir. Le bandeau s'affiche maintenant sur toutes
les pages.

**Changer le pixel dans `/admin/integrations` a maintenant un effet.**
L'identifiant du pixel était figé dans le code côté navigateur : seule la moitié
serveur suivait la configuration. Les deux moitiés pouvaient donc viser deux
pixels différents, ce qui rendait la déduplication impossible quel que soit le
jeton saisi.

## Ce qui change dans votre façon de travailler

**Les vidéos Instagram, Facebook, TikTok et Drive sont à republier.** Le
stockage de la plateforme est limité, et ces plateformes ne laissent récupérer
ni vignette ni lecture fiables. La marche à suivre est rappelée dans le
formulaire : télécharger la vidéo depuis le post d'origine avec une extension de
navigateur, la republier sur le compte YouTube de l'entreprise (en « non
répertoriée ») ou sur livid.com, puis coller ce lien. YouTube est géré de bout
en bout — lecture, vignette automatique, format vertical reconnu.

**Le formulaire de l'étude demande deux champs de plus** — Pays et Secteur
d'activité — et impose l'indicatif téléphonique. Les deux nouveaux champs
remontent dans le tableau des contacts et dans l'export CSV.

**L'alerte hebdomadaire part désormais par Mailchimp**, en une seule campagne
vers un segment, et non plus en e-mail individuel. La mise en forme est reprise
à la charte. Deux conséquences : le désabonnement est géré par Mailchimp, et le
nom et l'e-mail d'expéditeur doivent être renseignés dans Paramètres → Mailchimp
sinon la campagne ne peut pas être créée.

**Le bloc « À ne pas manquer » se coupe depuis `/admin/temps-forts`** quand
aucune session Décrypte n'est prévue. Le carrousel reprend alors toute la
largeur.

## Ce qu'il reste à faire

**De votre côté, rejouer la recette sur la préproduction.** Le détail ligne par
ligne, avec ce qu'il faut vérifier exactement, est dans le document de recette
joint. Rien n'a été validé fonctionnellement de mon côté : l'environnement de
développement n'a pas accès à la base, la vérification vous revient.

**Deux migrations de base sont à passer avant la recette** (numéros 17 et 18) :
sans elles, le mode « Visuel complet » reste sans effet et le formulaire de
l'étude échoue à l'enregistrement.

**La bascule Google Tag Manager est à programmer.** Le conteneur est installé,
mais tant qu'aucun identifiant `GTM-` n'est saisi dans `/admin/integrations`,
rien ne change. Dès qu'il l'est, la balise Analytics actuelle s'efface
automatiquement — sinon chaque page vue et chaque paiement seraient comptés deux
fois. Il faut donc d'abord configurer GA4 et le pixel dans le conteneur, vérifier
en mode Aperçu, puis basculer et surveiller 72 heures.

## Deux points de sécurité, à traiter rapidement

**Le jeton Meta Conversions API figure en clair dans le PDF du brief tracking**,
document qui a circulé par e-mail et WhatsApp. Il doit être **révoqué et
régénéré** dans Meta Business Manager, puis saisi uniquement dans
`/admin/integrations` — il n'y a plus besoin de déploiement pour le changer.

**Un e-mail et un mot de passe administrateur figuraient en clair** dans le code
de la page d'aide `/admin/guide`. Ils en sont retirés, mais **ce mot de passe
doit être changé** : il a été versionné, donc il est à considérer comme connu.

## Un point en attente de votre part

Pour **livid.com**, il me manque une URL d'exemple : la plateforme est bien
reconnue, mais son mode d'intégration n'est pas documenté publiquement. En
l'état, le lecteur propose un lien externe plutôt que de risquer un cadre vide.
Une seule URL suffit à terminer ce point.

Bien à vous,
