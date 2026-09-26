# ComptaFlow — application desktop du cabinet

Application de gestion pour cabinets comptables : clients, documents, demandes
de pièces, messagerie, tâches, échéances et factures. Elle est utilisée par le
cabinet (owner, admin, comptable, collaborateur, lecture seule) ; les clients
du cabinet utilisent l'application mobile Flutter.

- **Front** : React 18 + TypeScript + Vite, Tailwind + shadcn/ui, TanStack Query
- **Desktop** : Tauri 2 (installateur Windows `.exe`)
- **Backend** : API Django REST `a2t-expertise`, déployée sur
  `https://test.allinone.ovh` (Dokploy). Le même backend sert le mobile.

Ce dossier fait partie du dépôt qui contient aussi l'app mobile
(`../mobile`) : voir le [README à la racine](../README.md).

## Sommaire

- [Architecture](#architecture)
- [Notifications](#notifications)
- [Démarrer en local](#démarrer-en-local)
- [Construire l'installateur Windows](#construire-linstallateur-windows)
- [Structure du projet](#structure-du-projet)
- [API](#api)

## Architecture

```
 Desktop (ce dépôt)           Mobile (Flutter)
 cabinet                      clients du cabinet
        │  /api/v1/…                 │  /api/v1/client-portal/…
        │  + X-Entrepreneur-Id       │
        └──────────────┬─────────────┘
                       ▼
          Django REST (a2t-expertise)
          PostgreSQL · Redis · Celery
                       │
                       ▼  FCM (Firebase Cloud Messaging)
              notifications push Android
```

- **Authentification** : JWT (access 30 min, refresh 7 jours) stockés dans
  `localStorage`, rafraîchis automatiquement par `src/lib/api.ts`.
- **Multi-cabinet** : chaque requête porte l'en-tête `X-Entrepreneur-Id` du
  cabinet sélectionné.
- **Données** : toutes les lectures et écritures passent par `src/lib/api.ts`
  (client `fetch` typé, types dans `src/lib/api-types.ts`) et TanStack Query.
- **Fichiers** : jamais publics, téléchargés via les routes `…/download/` avec
  le JWT (dans Tauri, le fichier est enregistré au lieu d'ouvrir une fenêtre).

## Notifications

Le backend crée une notification quand le client envoie un document ou un
message, et quand le cabinet envoie une demande, un message ou refuse un
document (voir [MOBILE_API.md](MOBILE_API.md#règles-métier-automatiques)).

| Où | Comment | Quand |
|---|---|---|
| **Desktop** (cloche en haut à droite) | la liste est relue toutes les 60 s, même fenêtre réduite (`src/components/TopBar.tsx`) | app ouverte |
| **Desktop — notification Windows** | chaque nouvelle notification non lue s'affiche comme notification système (`src/hooks/use-desktop-notifications.ts`, plugin `tauri-plugin-notification`) | app ouverte ou réduite |
| **Mobile — push** | le backend envoie la notification via FCM au(x) téléphone(s) du client | même app fermée |

Une application desktop complètement fermée ne reçoit rien : il faut la
laisser ouverte ou réduite. Dans un navigateur (`npm run dev`), seule la
cloche fonctionne.

Côté serveur, le push mobile demande la variable `FCM_CREDENTIALS` (clé du
compte de service Firebase, sur une ligne) dans l'onglet *Environment* du
service Compose Dokploy, et le worker `celery` en marche.

## Démarrer en local

Prérequis : Node.js 18+ ; pour le desktop, Rust et les outils de build (voir
[BUILD.md](BUILD.md)).

```bash
npm install
cp .env.example .env      # VITE_API_URL = backend à utiliser
npm run dev               # navigateur : http://localhost:8080
npm run tauri:dev         # fenêtre desktop avec rechargement à chaud
```

| Variable | Rôle |
|---|---|
| `VITE_API_URL` | URL du backend Django (`https://test.allinone.ovh` ou `http://localhost:8000`) |
| `VITE_DEFAULT_ENTREPRENEUR_ID` | optionnel : cabinet présélectionné en développement |

Vérifications :

```bash
npx tsc -p tsconfig.app.json --noEmit   # types
npm run lint
npm test                                # Vitest
```

## Construire l'installateur Windows

**Par GitHub Actions (recommandé)** : chaque push lance
`.github/workflows/desktop.yml` (à la racine du dépôt) sur Windows (types, build Vite, build
Tauri NSIS). L'installateur se télécharge dans l'onglet **Actions** → le run →
**Artifacts** → `comptaflow-desktop-windows` (conservé 14 jours). L'app
installée utilise `https://test.allinone.ovh`.

**En local** : `npm run tauri:build`. Détails et dépannage dans
[BUILD.md](BUILD.md).

L'installateur n'est pas signé : Windows SmartScreen affiche un avertissement
au premier lancement (*Informations complémentaires* → *Exécuter quand même*).

## Structure du projet

```
├── src/
│   ├── pages/            # écrans (Dashboard, Clients, Documents, Demandes,
│   │                     #  Messages, Tâches, Échéances, Factures, Paramètres, Admin)
│   ├── components/       # AppLayout, AppSidebar, TopBar (notifications), ui/ (shadcn)
│   ├── contexts/         # AuthContext (JWT + cabinet sélectionné)
│   ├── hooks/            # use-desktop-notifications, use-toast, use-mobile
│   └── lib/              # api.ts, api-types.ts, client-data.ts
├── src-tauri/
│   ├── src/lib.rs        # plugins Tauri (opener, notification)
│   ├── capabilities/     # permissions (default.json)
│   └── tauri.conf.json   # fenêtre, identifiant, bundle
├── BUILD.md              # build Windows pas à pas
└── MOBILE_API.md         # API partagée desktop / mobile
```

## API

Les routes, l'accès des clients à l'application mobile et les règles métier
sont décrits dans [MOBILE_API.md](MOBILE_API.md).
