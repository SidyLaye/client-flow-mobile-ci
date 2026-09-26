# ComptaFlow Client — application mobile (Flutter)

Application Android (et iOS) des **clients** du cabinet. Le client se connecte
avec l'identifiant fourni par son cabinet et peut :

- voir ses **documents** et leur statut, les ouvrir ou les partager ;
- voir les **demandes de pièces** du cabinet (priorité, échéance) et y répondre ;
- **scanner** un document (détection des bords, plusieurs pages, PDF créé sur
  le téléphone) ou choisir une photo / un fichier, puis l'**envoyer** ;
- échanger par **messagerie** avec le cabinet ;
- recevoir des **notifications**, y compris app fermée (push Firebase).

Il n'y a pas d'inscription : c'est le cabinet qui crée l'accès depuis l'app
desktop (fiche client → *Accès application*).

Ce dossier fait partie du dépôt qui contient aussi l'app desktop du cabinet
(`../desktop`) : voir le [README à la racine](../README.md).

## Backend

L'app parle au backend Django
[`comptaflow-backend`](https://github.com/SidyLaye/comptaflow-backend),
déployé sur `https://test.allinone.ovh`, uniquement par les routes
`/api/v1/client-portal/…` : un client ne voit jamais que ses propres données.

| Écran | API |
|---|---|
| Connexion | `POST /api/v1/auth/login/` (JWT) puis `GET /client-portal/me/` |
| Accueil | `GET /client-portal/summary/` |
| Documents | `GET /client-portal/documents/`, `…/<id>/`, `…/<id>/download/` |
| Demandes | `GET /client-portal/requests/`, `…/<id>/` (la passe à *vue*) |
| Scanner et envoyer | `POST /client-portal/documents/upload/` |
| Messages | `GET /client-portal/messages/` (+ `?since=`), `POST …/`, `POST …/mark-all-read/` |
| Notifications | `GET /client-portal/notifications/`, `POST …/<id>/read/` |
| Push | `POST` / `DELETE /client-portal/push-tokens/` |

Détail complet : [`../desktop/MOBILE_API.md`](../desktop/MOBILE_API.md).

## Notifications push

```
action du cabinet ─▶ le backend crée la notification ─▶ Celery ─▶ Firebase (FCM)
                  ─▶ Android l'affiche (même app fermée) ─▶ un appui ouvre l'élément
```

1. À la connexion, l'app demande l'autorisation d'afficher des notifications
   et enregistre le téléphone auprès du backend (`push-tokens`). La
   déconnexion l'oublie.
2. Le backend envoie chaque nouvelle notification du client à ses téléphones.
3. App ouverte, la notification est affichée par
   `flutter_local_notifications` (canal `default`).

Configuration :

- **App** : la configuration Firebase du projet `mourad-7bf2a` est intégrée
  (`lib/core/config/env.dart`). Ces identifiants sont publics par nature (ils
  sont dans l'APK). Pour un autre projet Firebase, passer `FIREBASE_*` avec
  `--dart-define` (voir `.env.example`).
- **Backend** : variable `FCM_CREDENTIALS` (clé secrète du compte de service
  Firebase) et service `celery` en marche.
- **iOS** : activer *Push Notifications* dans Xcode, ajouter une app iOS au
  projet Firebase, y déposer la clé APNs et passer `FIREBASE_IOS_APP_ID`.

Diagnostic : sur le serveur, `python manage.py push_check email@client.fr`
indique si le téléphone est enregistré et lui envoie une notification de test.

## Télécharger l'APK

Chaque modification de `mobile/` lance le workflow **Mobile (APK)** (onglet
*Actions* du dépôt) : analyse, tests, puis construction de l'APK pour
`https://test.allinone.ovh`. Le fichier est dans *Artifacts* →
`ComptaFlow-Client-Android` → `ComptaFlow-Client-Android.apk` (14 jours).

L'APK est signé avec une clé de développement : si Android refuse la mise à
jour, désinstaller l'ancienne version d'abord.

## Développer

```bash
cd mobile
flutter pub get
cp .env.example .env
flutter run --dart-define-from-file=.env
```

| Variable | Défaut | Rôle |
|---|---|---|
| `API_URL` | `https://test.allinone.ovh` | backend Django |
| `POLL_SECONDS` | `10` | rafraîchissement des messages (notifications : ×3) |
| `FIREBASE_*` | projet `mourad-7bf2a` | projet Firebase pour le push |

Pour un backend sur le réseau local : `API_URL=http://<ip>:8000` (Android
demande alors `usesCleartextTraffic` pour ce build de debug uniquement).

Prérequis : Flutter ≥ 3.47 / Dart ≥ 3.13 · Android `minSdk 24` · iOS 15.

```bash
flutter analyze
flutter test
flutter build apk --dart-define-from-file=.env
```

## Architecture

Architecture **BLoC** (`flutter_bloc`), une fonctionnalité par dossier, chacun
découpé en `data` (modèles + accès à l'API), `bloc` (logique, états
immuables) et `presentation` (écrans, sans appel réseau).

```
lib/
├── main.dart                 # démarrage : client API + push
├── app.dart                  # assemblage : dépôts → AuthBloc → navigation
├── core/
│   ├── config/env.dart       # API_URL, POLL_SECONDS, Firebase (--dart-define)
│   ├── api/                  # client HTTP (JWT, rafraîchissement, erreurs), stockage sécurisé des jetons
│   ├── router/               # go_router : redirection si non connecté, onglets
│   ├── theme/                # couleurs, espacements
│   └── utils/, widgets/      # formatage, composants communs
└── features/
    ├── auth/        connexion, session, déconnexion
    ├── home/        compteurs de l'accueil
    ├── documents/   liste et détail des documents
    ├── requests/    demandes de pièces
    ├── messages/    messagerie
    ├── profile/     profil et notifications
    ├── scan/        scanner / galerie / fichier
    ├── upload/      création du PDF et envoi
    └── push/        notifications push (Firebase)
```

- `AuthBloc` vit pendant toute l'app et pilote la navigation : pas de session
  valide ⇒ écran de connexion.
- Les autres blocs vivent avec leur écran.
- Les nouveaux messages et notifications sont relus régulièrement tant que
  l'écran est ouvert.

Les tests (`test/`, `bloc_test` + `mocktail`) couvrent la connexion, le scan,
l'envoi et la messagerie.

## À savoir

- Un appareil = un enregistrement push : se connecter sur un 2e téléphone
  l'ajoute ; se déconnecter n'oublie que le téléphone concerné.
- Le scanner a besoin d'une vraie caméra ; sinon, utiliser *Galerie* ou
  *Fichier*.
- Les photos sont recompressées (JPEG qualité 80, ≥ 1600 px) avant d'être
  mises dans le PDF.
- Les jetons de connexion sont dans le stockage sécurisé du téléphone ; la
  sauvegarde Android est désactivée pour qu'ils ne soient jamais restaurés sur
  un autre appareil.
