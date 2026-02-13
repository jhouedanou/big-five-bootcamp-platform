# 📄 Modale légale - Guide d'utilisation

## ✅ Composant créé

Une modale réutilisable pour afficher les **CGU**, **CGV** et la **Politique de confidentialité** a été créée dans `components/legal-modal.tsx`.

## 🎯 Fonctionnalités

- **3 onglets** : CGU, CGV et Politique de confidentialité
- **Contenu défilable** avec ScrollArea
- **Design moderne** avec Radix UI
- **Personnalisable** : trigger et onglet par défaut

## 🚀 Utilisation

### 1. Import du composant

```tsx
import { LegalModal } from "@/components/legal-modal"
```

### 2. Utilisation simple (bouton par défaut)

```tsx
<LegalModal />
```

### 3. Avec un trigger personnalisé

```tsx
<LegalModal 
  trigger={
    <button className="text-primary hover:underline">
      Voir les conditions
    </button>
  }
/>
```

### 4. Avec un onglet par défaut

```tsx
<LegalModal 
  defaultTab="cgv"  // "cgu" | "cgv" | "privacy"
  trigger={<button>Voir les CGV</button>}
/>
```

## 📍 Où c'est utilisé

### ✅ Page d'inscription (`app/register/page.tsx`)

```tsx
<LegalModal 
  trigger={
    <button type="button" className="text-primary hover:underline">
      CGU, CGV et la politique de confidentialité
    </button>
  }
/>
```

### ✅ Page d'abonnement (`app/subscribe/page.tsx`)

```tsx
<LegalModal 
  defaultTab="cgv"
  trigger={
    <button type="button" className="text-primary hover:underline">
      CGV et la politique de confidentialité
    </button>
  }
/>
```

### ✅ Footer (`components/footer.tsx`)

```tsx
// CGU
<LegalModal 
  defaultTab="cgu"
  trigger={
    <button className="text-sm text-left">CGU</button>
  }
/>

// CGV
<LegalModal 
  defaultTab="cgv"
  trigger={
    <button className="text-sm text-left">CGV</button>
  }
/>

// Confidentialité
<LegalModal 
  defaultTab="privacy"
  trigger={
    <button className="text-sm text-left">Confidentialité</button>
  }
/>
```

## 🎨 Contenu de la modale

### CGU (Conditions Générales d'Utilisation)
- Introduction
- Licence d'utilisation
- Utilisation acceptable
- Compte utilisateur
- Propriété intellectuelle
- Clause de non-responsabilité
- Limitations
- Modifications des conditions
- Résiliation
- Loi applicable

### CGV (Conditions Générales de Vente)
- Objet
- Prix et tarification
- Modalités de paiement
- Abonnements et renouvellement
- Droit de rétractation
- Remboursements
- Livraison du service
- Annulation et suspension
- Facturation
- Service client

### Politique de Confidentialité
- Introduction
- Informations collectées
- Utilisation des informations
- Partage des informations
- Sécurité des données
- Conservation des données
- Vos droits
- Cookies
- Transferts internationaux
- Modifications de la politique
- Contact

## 🛠️ Composants UI créés

En plus de la modale, deux composants UI Radix ont été créés :

1. **`components/ui/tabs.tsx`**
   - Basé sur `@radix-ui/react-tabs`
   - Gère l'affichage des onglets

2. **`components/ui/scroll-area.tsx`**
   - Basé sur `@radix-ui/react-scroll-area`
   - Zone défilable avec scrollbar stylisée

## 📦 Dépendances

Toutes les dépendances nécessaires sont déjà installées :
- `@radix-ui/react-tabs` ✅
- `@radix-ui/react-scroll-area` ✅
- `@radix-ui/react-dialog` ✅

## 🎯 Avantages

1. **UX améliorée** : Les utilisateurs n'ont pas besoin de quitter la page
2. **Accessibilité** : Utilise les composants Radix UI accessibles
3. **Responsive** : S'adapte aux différentes tailles d'écran
4. **Réutilisable** : Un seul composant pour toutes les pages
5. **Personnalisable** : Trigger et onglet par défaut configurables

## 🔄 Pages legacy

Les pages `/terms` et `/privacy` existent toujours et continuent de fonctionner pour :
- SEO (indexation Google)
- Liens directs externes
- Compatibilité ascendante

## 🧪 Tester

1. **Page d'inscription** :
   ```bash
   open http://localhost:3000/register
   ```
   Cliquer sur "CGU, CGV et la politique de confidentialité"

2. **Page d'abonnement** :
   ```bash
   open http://localhost:3000/subscribe
   ```
   Cliquer sur "CGV et la politique de confidentialité"

3. **Footer** :
   Cliquer sur "CGU", "CGV" ou "Confidentialité" dans le footer

## 🎬 Démo vidéo

La modale s'ouvre avec :
- Animation fluide
- 3 onglets cliquables
- Contenu défilable
- Fermeture en cliquant à l'extérieur ou sur X

---

**Note** : Le contenu des CGU, CGV et Politique de confidentialité est un exemple. Vous devez le remplacer par vos propres conditions légales validées par un avocat.
