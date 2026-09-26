# ComptaFlow Client — Mobile App (Flutter)

Flutter companion app for the **client side** of ComptaFlow / A2T Expertise, built with the **BLoC architecture** (`flutter_bloc`). Clients sign in with credentials issued by their accountant (*comptable*) and can scan, upload, and message documents straight from their phone.

> Flutter port of the former Expo app, now backed by the Django REST API shared with the cabinet desktop app (Supabase removed).

## Backend

The app talks to the **same Django REST backend as the cabinet desktop app**
(`a2t-expertise`, deployed on `https://test.allinone.ovh`). Supabase is no
longer used. Everything goes through the client-scoped API
`/api/v1/client-portal/`: a client only ever sees its own records.

| Screen | API |
|---|---|
| Login | `POST /api/v1/auth/login/` (JWT) then `GET /client-portal/me/` |
| Home | `GET /client-portal/summary/` |
| Documents | `GET /client-portal/documents/`, `GET …/<id>/`, `GET …/<id>/download/` |
| Requests | `GET /client-portal/requests/`, `GET …/<id>/` (marks it *seen*) |
| Scan & send | `POST /client-portal/documents/upload/` (multipart: file, title, category, client_comment, document_request) |
| Messages | `GET /client-portal/messages/` (+ `?since=` polling), `POST …/`, `POST …/mark-all-read/` |
| Notifications | `GET /client-portal/notifications/`, `POST …/<id>/read/` |
| Push | `POST` / `DELETE /client-portal/push-tokens/` |

Accounts are created by the cabinet from the desktop app (client page →
*Accès application*). There is no sign-up screen.

## Features

- **Login** with the email/password given by the cabinet. The JWT pair is kept
  in the OS secure storage (Keychain / Keystore); the access token is refreshed
  automatically and the app returns to the login screen if the cabinet
  suspends the access or resets the password.
- **Home** — open requests, pending documents, unread notifications.
- **Documents** — documents visible to the client, with status; open/share the
  file (authenticated download).
- **Document requests** — what the cabinet asks for, priority, due date, and a
  one-tap "Répondre avec un document".
- **Scan to PDF** — native edge detection (VisionKit / ML Kit), multi-page,
  gallery / file fallback, PDF built on-device.
- **Upload review** — title, category (same codes as the desktop), comment;
  sent as the answer to the request when opened from one. A copy is kept on the
  device (`scans/`).
- **Messaging** — conversation with the cabinet; new messages checked every
  `POLL_SECONDS` (default 10 s) while the screen is open.
- **Notifications** — created by the backend (new request, reminder, document
  refused/incomplete, new message); tap opens the related item.

## Architecture

Feature-first layout; every feature is split into `data` (models + repository over the REST API), `bloc` (Bloc + sealed events + immutable `Equatable` state) and `presentation` (widgets only — no API calls in the UI).

```
lib/
├── main.dart                      # ApiClient + push init, runApp
├── app.dart                       # Composition root: repositories → AuthBloc → router
├── core/
│   ├── config/env.dart            # API_URL / POLL_SECONDS (--dart-define)
│   ├── api/api_client.dart        # JWT, refresh, errors (Django REST)
│   ├── api/token_store.dart       # secure storage of the JWT pair
│   ├── theme/app_theme.dart       # Colors / radius / spacing tokens + ThemeData
│   ├── router/
│   │   ├── app_router.dart        # go_router: auth redirect + StatefulShellRoute tabs
│   │   ├── main_shell.dart        # Bottom-tab scaffold
│   │   ├── routes.dart            # Path constants + UploadReviewArgs
│   │   ├── refresh_on_focus.dart  # useFocusEffect equivalent
│   │   └── navigation.dart        # popToTop()
│   ├── utils/formatters.dart
│   └── widgets/                   # PrimaryButton, StatusBadge, dialogs, …
└── features/
    ├── auth/        AuthBloc — session + client_accounts gate, sign in/out
    ├── home/        HomeBloc — dashboard counters
    ├── documents/   DocumentsBloc (list) · DocumentDetailBloc (detail + open)
    ├── requests/    RequestsBloc (list) · RequestDetailBloc
    ├── messages/    MessagesBloc — history + realtime + send
    ├── profile/     ProfileBloc — company, notifications (realtime), mark read
    ├── scan/        ScanBloc — native scanner / gallery / file picker
    ├── upload/      UploadBloc — PDF build → storage upload → documents row
    └── push/        PushService (abstract) · FirebasePushService · NoopPushService
```

### State flow

```
Widget ──event──▶ Bloc ──▶ Repository ──▶ ApiClient
   ▲                │
   └────state───────┘   (BlocBuilder / BlocListener for one-shot effects)
```

- `AuthBloc` is app-scoped (provided in `app.dart`). Its state drives the router's `redirect` through `refreshListenable`: no session or a refused session ⇒ `/login`.
- Every other bloc is page-scoped (`BlocProvider` in the page widget) and receives `clientId` / `userId` from `AuthBloc` at creation time.
- One-shot effects (alerts, navigation after upload, PDF hand-off from the file picker) are modelled as nullable state fields consumed by a `BlocListener`, then cleared with an explicit `…Consumed` event.
- New messages / notifications are exposed by repositories as polling `Stream`s, owned by the bloc, which cancels them in `close()`.

## Getting started

```bash
cd client-flow-mobile
flutter pub get
cp .env.example .env          # API_URL defaults to https://test.allinone.ovh
flutter run --dart-define-from-file=.env
```

### Env vars

| Name | Default | |
|---|---|---|
| `API_URL` | `https://test.allinone.ovh` | Django backend |
| `POLL_SECONDS` | `10` | refresh interval for messages (notifications: ×3) |

For a local backend on the LAN use `http://<ip>:8000`; Android then needs
`android:usesCleartextTraffic="true"` for that debug build only.

### Requirements

- Flutter ≥ 3.47 / Dart ≥ 3.13
- Android: `minSdk 24`; backups are disabled so the secure storage is never
  restored on another device.
- iOS: deployment target 15.0, usage strings in `ios/Runner/Info.plist`.

### Push notifications (FCM, optional)

The device registers its FCM token with the backend. Without Firebase config
the app logs `[push] Firebase not configured` and push is a no-op; in-app
notifications still work. The backend sends each new notification to the
user's devices through FCM HTTP v1 (`FCM_CREDENTIALS` on the Django side), so it
shows up even when the app is closed.

To enable it:

1. Create a Firebase project and add an Android app `com.comptaflow.client`
   (and an iOS app with the same bundle id).
2. Pass the app's values with `--dart-define` (see `.env.example`):
   `FIREBASE_PROJECT_ID`, `FIREBASE_SENDER_ID`, `FIREBASE_API_KEY`,
   `FIREBASE_ANDROID_APP_ID`, `FIREBASE_IOS_APP_ID`. CI reads them from the
   repository secrets of the same names.
3. iOS only: enable *Push Notifications* in Xcode and upload the APNs key to
   Firebase.

## Build & test

```bash
flutter analyze
flutter test
flutter build apk --dart-define-from-file=.env
flutter build ipa --dart-define-from-file=.env
```

Bloc tests live in `test/features/**` (`bloc_test` + `mocktail`) and cover the auth gate, scan flow, upload flow, and messaging.

## Notes / known caveats

- Push tokens are device-scoped: signing in on a second phone registers a second token. Sign-out removes only the token of the device that signed out (intentional).
- `cunning_document_scanner` needs a real device/simulator with a camera. Without one, the automatic launch shows an alert and the user can fall back to *Galerie* / *Fichier*.
- Images are re-encoded as JPEG (quality 80, ≥1600 px on the short side) before being embedded in the PDF, mirroring the former `expo-image-manipulator` step.
