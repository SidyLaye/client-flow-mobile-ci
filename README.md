# ComptaFlow — applications desktop et mobile

Ce dépôt contient les **deux applications** de ComptaFlow / A2T Expertise :

| Dossier | Application | Pour qui | Techno | Livrable |
|---|---|---|---|---|
| [`desktop/`](desktop/) | App du **cabinet** : clients, documents, demandes, messages, tâches, échéances, factures | le cabinet comptable | React + TypeScript + Tauri 2 | installateur Windows `.exe` |
| [`mobile/`](mobile/) | App des **clients** du cabinet : scanner et envoyer des pièces, répondre aux demandes, messagerie | les clients | Flutter (BLoC) | APK Android |

Le **backend** est dans un dépôt séparé :
[`SidyLaye/comptaflow-backend`](https://github.com/SidyLaye/comptaflow-backend)
(Django REST, PostgreSQL, Redis, Celery), déployé avec Dokploy sur
`https://test.allinone.ovh`. Les deux apps parlent à ce même backend.

```
  desktop/ (cabinet)                 mobile/ (clients)
        │  /api/v1/…                       │  /api/v1/client-portal/…
        └────────────────┬─────────────────┘
                         ▼
            backend Django (comptaflow-backend)
                         │
                         ▼  Firebase Cloud Messaging
                notifications push Android
```

## Télécharger les apps

Chaque push construit automatiquement l'app modifiée (onglet **Actions**) :

| Workflow | Se lance quand… | Résultat (onglet *Artifacts* du run, 14 jours) |
|---|---|---|
| **Mobile (APK)** — `.github/workflows/mobile.yml` | `mobile/` change | `ComptaFlow-Client-Android` → `ComptaFlow-Client-Android.apk` |
| **Desktop (Windows .exe)** — `.github/workflows/desktop.yml` | `desktop/` change | `ComptaFlow-Cabinet-Windows` → `ComptaFlow-Cabinet-Windows-Setup.exe` |
| **E2E (API déployée)** — `.github/workflows/e2e.yml` | lancement manuel (*Run workflow*) | vérifie le parcours cabinet ⇄ client sur le serveur ; crée puis supprime un client de test |

Les deux workflows de build se relancent aussi à la main (*Run workflow*).

## Notifications

| App | Comment elle est prévenue |
|---|---|
| Mobile | **push Firebase** : la notification arrive même app fermée |
| Desktop | la cloche est relue toutes les 15 s et chaque nouveauté s'affiche en **notification Windows** ; fermer la fenêtre laisse l'app tourner près de l'horloge, et elle démarre avec Windows |

Réglages : l'app mobile embarque la configuration Firebase du projet
`mourad-7bf2a` ; le backend a besoin de la clé du compte de service dans la
variable `FCM_CREDENTIALS` (onglet *Environment* de Dokploy). Détails dans
[`mobile/README.md`](mobile/README.md#push-notifications-fcm).

## Travailler en local

```bash
# Desktop (Node 18+, Rust pour la fenêtre Tauri)
cd desktop
npm install
npm run dev          # navigateur, http://localhost:8080
npm run tauri:dev    # fenêtre desktop

# Mobile (Flutter ≥ 3.47)
cd mobile
flutter pub get
flutter run
```

Documentation détaillée :

- [`desktop/README.md`](desktop/README.md) — architecture, notifications, structure
- [`desktop/BUILD.md`](desktop/BUILD.md) — construire le `.exe` sous Windows
- [`desktop/MOBILE_API.md`](desktop/MOBILE_API.md) — API partagée et règles métier
- [`mobile/README.md`](mobile/README.md) — architecture BLoC, push, build

## Origine

Les deux apps viennent des dépôts de Mourad
([`derradji-mourad/A2TExpertise`](https://github.com/derradji-mourad/A2TExpertise)
pour le desktop, [`derradji-mourad/client-flow-mobile`](https://github.com/derradji-mourad/client-flow-mobile)
pour le mobile). Ce dépôt contient leur version branchée sur le backend
Django ; l'historique Git des deux projets est conservé.
