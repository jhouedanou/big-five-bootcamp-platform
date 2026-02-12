# 🌍 Système de paiement multi-pays avec détection automatique d'opérateur

## Nouvelles fonctionnalités

### ✨ Sélection de pays
- 🇨🇮 **Côte d'Ivoire** (+225)
- 🇸🇳 **Sénégal** (+221)
- 🇧🇯 **Bénin** (+229)

### 📱 Masque de saisie adaptatif

Le numéro de téléphone s'adapte automatiquement selon le pays :

**Côte d'Ivoire** : `XX XX XX XX XX` (10 chiffres)
- Exemple : `07 12 34 56 78`

**Sénégal** : `XX XXX XX XX` (9 chiffres)
- Exemple : `77 123 45 67`

**Bénin** : `XX XX XX XX` (8 chiffres)
- Exemple : `96 12 34 56`

### 🤖 Détection automatique de l'opérateur

L'opérateur est détecté automatiquement dès la saisie des 2 premiers chiffres :

#### 🇨🇮 Côte d'Ivoire
- **07, 08, 09** → Orange Money CI
- **05, 06** → MTN Mobile Money CI
- **01** → Moov Money CI
- Wave CI (sélection manuelle)

#### 🇸🇳 Sénégal
- **77, 78, 76** → Orange Money
- **70** → Wave
- **75, 76** → Free Money

#### 🇧🇯 Bénin
- **96, 97, 90, 91** → MTN Mobile Money BJ
- **99, 98** → Moov Money BJ

### 🎯 Fonctionnement

1. **Sélection du pays** → Liste déroulante avec drapeaux et indicatifs
2. **Saisie du numéro** → Masque automatique selon le pays
3. **Détection automatique** → L'opérateur s'affiche avec une confirmation visuelle
4. **Validation** → Le numéro complet est envoyé avec l'indicatif pays

### 💡 Expérience utilisateur

#### Avant (2 chiffres saisis)
```
Pays: 🇨🇮 Côte d'Ivoire (+225)
Numéro: [+225] [07 __]
Status: En attente...
```

#### Après (détection)
```
Pays: 🇨🇮 Côte d'Ivoire (+225)
Numéro: [+225] [07 12 34 56 78]
Opérateur détecté: ✅ Orange Money CI
```

### 🔧 Configuration technique

Les opérateurs sont mappés vers les noms PayTech officiels :

```typescript
CI: {
  "Orange Money CI"   // Préfixes: 07, 08, 09
  "Mtn Money CI"      // Préfixes: 05, 06
  "Moov Money CI"     // Préfixe: 01
  "Wave CI"           // Sélection manuelle
}

SN: {
  "Orange Money"      // Préfixes: 77, 78, 76
  "Wave"             // Préfixe: 70
  "Free Money"       // Préfixes: 75, 76
}

BJ: {
  "Mtn Money BJ"     // Préfixes: 96, 97, 90, 91
  "Moov Money BJ"    // Préfixes: 99, 98
}
```

### 📊 Données envoyées à PayTech

```json
{
  "userEmail": "user@example.com",
  "paymentMethod": "Orange Money CI",
  "phoneNumber": "+22507123456789"
}
```

### 🎨 Interface

- **Badge de confirmation** : Affiche l'opérateur détecté avec icône ✅
- **Indicatif fixe** : Zone grisée non-modifiable avec le code pays
- **Sélection manuelle** : Si l'opérateur n'est pas détecté automatiquement
- **Aide contextuelle** : Format de numéro affiché sous le champ

### ✅ Validation

- Nombre de chiffres exact selon le pays
- Opérateur sélectionné (automatique ou manuel)
- Numéro formaté correctement

---

**Les modifications sont maintenant actives sur `/subscribe` !** 🎉
