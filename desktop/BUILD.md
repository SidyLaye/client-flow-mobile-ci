# ComptaFlow desktop — construire et lancer sous Windows

Le plus simple est de **laisser GitHub construire l'installateur** : chaque
modification de `desktop/` lance le workflow **Desktop (Windows .exe)**
(onglet *Actions* du dépôt), et l'installateur se télécharge dans *Artifacts*
→ `ComptaFlow-Cabinet-Windows` → `ComptaFlow-Cabinet-Windows-Setup.exe`.

Ce guide sert à lancer ou construire l'app **sur son propre PC**.

## 1. Prérequis (une seule fois)

1. **Node.js 18+** : https://nodejs.org/ (version LTS).
2. **Rust**, dans PowerShell :
   ```powershell
   winget install --id Rustlang.Rustup -e
   ```
   puis, dans un nouveau PowerShell :
   ```powershell
   rustup default stable
   ```
3. **Visual Studio Build Tools** :
   https://visualstudio.microsoft.com/visual-cpp-build-tools/ → cocher
   **« Développement Desktop en C++ »**.
4. **WebView2** : déjà présent sur Windows 10 21H2+ et 11
   (sinon : https://developer.microsoft.com/microsoft-edge/webview2/).

Vérification :

```powershell
node --version
rustc --version
cargo --version
```

## 2. Configurer

Copier `.env.example` en `.env` et indiquer le backend :

```env
VITE_API_URL="https://test.allinone.ovh"
```

`http://localhost:8000` pour un backend lancé sur le PC. La valeur est
intégrée au build : reconstruire après l'avoir changée.

## 3. Installer les dépendances

```powershell
cd chemin\vers\comptaflow-apps\desktop
npm install
```

## 4. Lancer en développement

```powershell
npm run tauri:dev     # fenêtre desktop, rechargement à chaud
npm run dev           # navigateur seulement : http://localhost:8080
```

## 5. Construire l'installateur

```powershell
npm run tauri:build
```

Les installateurs sont créés dans `target\release\bundle\` (le dossier
`desktop/` est la racine Cargo) :

- `bundle\nsis\ComptaFlow_0.1.0_x64-setup.exe` — installateur recommandé
- `bundle\msi\ComptaFlow_0.1.0_x64_en-US.msi` — version MSI

Le premier build est long (Rust compile toutes les dépendances), les suivants
prennent 30 à 90 secondes.

## 6. Signature (optionnel)

L'installateur n'est pas signé : Windows SmartScreen avertit au premier
lancement (*Informations complémentaires* → *Exécuter quand même*). Pour le
distribuer largement, il faut un certificat de signature de code :
https://v2.tauri.app/distribute/sign/windows/

## 7. Problèmes fréquents

| Problème | Solution |
| --- | --- |
| `npm install` échoue sur `@swc/core` | Relancer ; si ça persiste, supprimer `node_modules` et `package-lock.json` puis `npm install`. |
| `cargo` introuvable | Rouvrir PowerShell après l'installation de Rust. |
| `link.exe not found` | Installer « Développement Desktop en C++ » dans Visual Studio Build Tools. |
| « Failed to fetch » dans la fenêtre | `VITE_API_URL` est faux ou le backend est arrêté : vérifier `.env` et reconstruire. |
| Pas de notification Windows | Paramètres Windows → Système → Notifications : activer ComptaFlow et désactiver « Ne pas déranger ». L'app doit tourner (icône près de l'horloge) ; Paramètres de l'app → *Tester les notifications*. |
| Deux icônes / l'app ne se ferme pas | Normal : ✕ cache la fenêtre. Pour quitter : clic droit sur l'icône près de l'horloge → *Quitter ComptaFlow*. |

## 8. Structure

```
├── src/                # app React (TypeScript + Tailwind + shadcn/ui)
│   ├── pages/          # écrans
│   ├── components/     # composants (TopBar = cloche des notifications)
│   ├── contexts/       # AuthContext (JWT + cabinet sélectionné)
│   ├── hooks/          # use-desktop-notifications (notifications Windows, démarrage auto)
│   └── lib/            # api.ts — client typé de l'API Django
└── src-tauri/          # partie Rust + configuration Tauri
    ├── src/lib.rs      # plugins, icône près de l'horloge, une seule instance
    ├── icons/          # icônes de l'app
    ├── capabilities/   # permissions Tauri (default.json)
    └── tauri.conf.json # fenêtre, identifiant, installateur
```
