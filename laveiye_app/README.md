# LAVEIYE — Wrapper natif Flutter (Android + iOS)

App mobile qui encapsule **https://laveiye.com** dans une WebView native propre,
prête à publier sur le Play Store et l'App Store.

Aucun mot de passe stocké en dur : login/session 100 % côté site web.

---

## 1. Structure du projet

```
laveiye_app/
├── pubspec.yaml                      # Dépendances + config icônes
├── flutter_native_splash.yaml        # Config splash natif
├── analysis_options.yaml
├── assets/images/                    # logo.png, splash_logo.png, logo_foreground.png
├── lib/
│   ├── main.dart                     # Bootstrap + thème
│   ├── webview_page.dart             # WebView + NavigationDelegate + PopScope + cache
│   ├── config/
│   │   └── app_config.dart           # URL, couleurs, hosts internes
│   ├── services/
│   │   └── url_launcher_service.dart # Ouverture liens externes
│   └── widgets/
│       ├── error_screen.dart         # Écran erreur custom
│       └── offline_screen.dart       # Écran "Pas de connexion"
├── android/app/src/main/AndroidManifest.xml   # Permissions + queries
└── ios/Runner/Info.plist             # Permissions + ATS
```

Séparation claire : **UI** (`webview_page`, `widgets`) / **services** (`services`) /
**config** (`config`).

---

## 2. Génération du squelette Flutter

Ce dossier contient le code métier. Génère les fichiers natifs (gradle, xcode,
mipmaps…) par-dessus, sans écraser le code fourni :

```bash
cd laveiye_app

# Crée la plateforme Android/iOS sans toucher à lib/ ni pubspec.yaml.
# Remplace l'org par ton identifiant inversé.
flutter create . --org com.laveiye --project-name laveiye_app \
  --platforms=android,ios

flutter pub get
```

> Si `flutter create` écrase `AndroidManifest.xml` / `Info.plist`, restaure les
> deux fichiers fournis ici (ils contiennent les permissions nécessaires).

---

## 3. Assets requis

Place ces images avant de générer icônes/splash :

| Fichier | Taille | Usage |
|---|---|---|
| `assets/images/logo.png` | 1024×1024 | Icône app |
| `assets/images/logo_foreground.png` | 1024×1024 (logo centré, ~66 % cadre, fond transparent) | Icône adaptative Android |
| `assets/images/splash_logo.png` | ~512×512 PNG transparent | Splash |

---

## 4. Icônes & Splash

```bash
# Icônes Android (adaptative) + iOS
dart run flutter_launcher_icons

# Splash natif Android 12+ et iOS
dart run flutter_native_splash:create
```

Couleur de thème par défaut : `#F2B33D` (à ajuster sur la couleur réelle du site
dans `lib/config/app_config.dart` ET les deux YAML).

---

## 5. Réglages plateforme à vérifier

### Android — `android/app/build.gradle`
```gradle
android {
    defaultConfig {
        minSdkVersion 23        // requis par webview_flutter / permission_handler
        targetSdkVersion 34
    }
}
```

### iOS — `ios/Podfile`
```ruby
platform :ios, '12.0'
```
Puis :
```bash
cd ios && pod install && cd ..
```

---

## 6. Lancer en développement

```bash
flutter run            # appareil/émulateur connecté
```

---

## 7. Build release

### Android (APK + AAB)
```bash
# APK (test/distribution directe)
flutter build apk --release

# AAB (publication Play Store)
flutter build appbundle --release
```
Sorties :
- `build/app/outputs/flutter-apk/app-release.apk`
- `build/app/outputs/bundle/release/app-release.aab`

> Signature : crée un keystore et configure `android/key.properties` +
> `signingConfigs` dans `build.gradle` avant publication.

### iOS (IPA)
```bash
flutter build ipa --release
```
Sortie : `build/ios/ipa/*.ipa` — uploade via Xcode / Transporter.
Nécessite un compte Apple Developer + provisioning profile.

---

## 8. Fonctionnalités couvertes

| Exigence | Implémentation |
|---|---|
| WebView officielle | `webview_flutter` 4.x |
| JS unrestricted + DOM storage + cookies | `setJavaScriptMode(unrestricted)`, persistance par défaut |
| Liens internes restent dans WebView | `AppConfig.isInternalUrl` → `NavigationDecision.navigate` |
| Liens externes → app système | `url_launcher` `externalApplication` → `NavigationDecision.prevent` |
| Retour Android | `PopScope` + `canGoBack()` / confirmation `SystemNavigator.pop()` |
| reload / goBack / goForward | menu + pull-to-refresh |
| Progress / loading | `onProgress` + `LinearProgressIndicator` |
| Écran erreur | `onWebResourceError` → `ErrorScreen` |
| Persistance session | comportement par défaut (non cassé) |
| Vider cache | `clearCache()` + `clearLocalStorage()` + `clearCookies()` |
| Offline | `connectivity_plus` → `OfflineScreen` (offline réel = SW/PWA du site) |
| Splash natif | `flutter_native_splash` |
| Pull-to-refresh | `RefreshIndicator` + suivi scroll |
| Upload fichier/photo/caméra | `setOnShowFileSelector` + `permission_handler` |
| Géolocalisation | `setGeolocationPermissionsPromptCallbacks` + permission runtime |
| Permissions Android/iOS | Manifest + Info.plist |

---

## 9. Offline / PWA

L'app **ne réimplémente pas** l'offline. Si laveiye.com expose un Service Worker
(PWA), la WebView le respecte automatiquement → pages mises en cache navigables
hors-ligne. L'`OfflineScreen` ne s'affiche que sans aucune connexion réseau.

---

## 10. Validation Apple 4.2

Un simple wrapper WebView peut être rejeté (Guideline 4.2 « minimum
functionality »). Atouts déjà présents : splash natif, gestion erreur/offline,
pull-to-refresh, upload natif, géoloc, navigation native. Pour renforcer :
ajouter notifications push, partage natif, ou intégrations device si Apple
insiste.
