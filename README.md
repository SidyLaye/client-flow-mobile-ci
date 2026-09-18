# ComptaFlow Client — Mobile App (Flutter)

Flutter companion app for the **client side** of [ComptaFlow](../client-flow-main), built with the **BLoC architecture** (`flutter_bloc`). Clients sign in with credentials issued by their accountant (*comptable*) and can scan, upload, and message documents straight from their phone.

> This is the Flutter port of the former Expo / React Native app. Feature set, screens, copy and backend contract are unchanged; only the push provider moved from Expo Push to Firebase Cloud Messaging (see [Push notifications](#push-notifications-fcm)).

## Features

- **Login** with the email/password issued by the accounting firm. Sessions persist and are restored on launch (`supabase_flutter`).
- **Home** — quick overview of open requests, pending documents, and unread notifications.
- **Documents** — list visible documents with status badges; tap to open the file (signed URL → native share sheet).
- **Document requests** — see what the accountant is asking for, with priorities, due dates, and a one-tap "Répondre avec un document" CTA.
- **Scan to PDF** (CamScanner-style) — native edge detection + perspective correction (VisionKit on iOS / ML Kit on Android via `cunning_document_scanner`), multi-page capture, gallery/file picker fallback, PDF generation with the pure-Dart `pdf` package.
- **Upload review** — name the file, pick a category, add a comment, and upload to the `client-documents` bucket. Metadata is registered through the `create-document-record` Edge Function (with a direct-insert fallback respecting the existing RLS policy).
- **On-device copy** — every sent PDF is also kept under the app's Documents folder (`scans/`, visible in the iOS Files app); the success dialog offers to share it right away.
- **Messaging** — per-client conversation, hides internal staff notes, realtime updates via Supabase channel.
- **Notifications** — list of recent notifications with realtime inserts and tap-to-mark-read.
- **Push notifications** — FCM token per device stored in `push_tokens`.
- **Profile** — sign out.

## Architecture

Feature-first layout; every feature is split into `data` (models + repository over Supabase), `bloc` (Bloc + sealed events + immutable `Equatable` state) and `presentation` (widgets only — no Supabase calls in the UI).

```
lib/
├── main.dart                      # Supabase + push init, runApp
├── app.dart                       # Composition root: repositories → AuthBloc → router
├── core/
│   ├── config/env.dart            # SUPABASE_URL / SUPABASE_ANON_KEY (--dart-define)
│   ├── supabase/supabase_service.dart
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
Widget ──event──▶ Bloc ──▶ Repository ──▶ SupabaseService
   ▲                │
   └────state───────┘   (BlocBuilder / BlocListener for one-shot effects)
```

- `AuthBloc` is app-scoped (provided in `app.dart`). Its state drives the router's `redirect` through `refreshListenable`: no session or a non-`active` `client_accounts` row ⇒ `/login`.
- Every other bloc is page-scoped (`BlocProvider` in the page widget) and receives `clientId` / `userId` from `AuthBloc` at creation time.
- One-shot effects (alerts, navigation after upload, PDF hand-off from the file picker) are modelled as nullable state fields consumed by a `BlocListener`, then cleared with an explicit `…Consumed` event.
- Realtime subscriptions (`messages`, `notifications`) are exposed by repositories as `Stream`s and owned by the bloc, which cancels them in `close()`.

## How it integrates with the existing backend

This app reuses the **same Supabase project** as `client-flow-main`:

- The `clients` table already exposes a `Clients can read own client record` RLS policy (joins via `client_accounts`).
- The `documents` table already allows clients to `INSERT` rows for their own client and to `SELECT` rows where `visible_to_client = true`.
- Storage bucket `client-documents` is partitioned by `{client_id}/...`, which is the path used by the upload flow.
- The `messages` and `notifications` tables already support per-client realtime via `client_id` / `user_id` filters.
- The Edge Functions `create-document-record` and `send-message` are invoked when present; otherwise the app falls back to a direct insert, both of which are RLS-checked.

> The accountant creates the client portal account from the web app (`create-client-access` Edge Function). The mobile app does **not** need a signup screen.

## Getting started

```bash
cd client-flow-mobile
flutter pub get
cp .env.example .env          # fill in your Supabase URL + anon key
flutter run --dart-define-from-file=.env
```

### Env vars

The app reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` at compile time via `--dart-define-from-file=.env` (or individual `--dart-define` flags). They must be the same values used by the web app — see `client-flow-main/.env`. Add the same flag to `flutter build`.

### Requirements

- Flutter ≥ 3.47 / Dart ≥ 3.13
- Android: `minSdk 24` (ML Kit document scanner), permissions declared in `android/app/src/main/AndroidManifest.xml`
- iOS: deployment target 15.0, usage strings declared in `ios/Runner/Info.plist` (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`)

### Push notifications (FCM)

The Expo push service is not available outside Expo, so the app registers an **FCM registration token** in `push_tokens` (`platform` = `android` / `ios`). Firebase is optional at runtime: without config the app logs `[push] Firebase not configured` and push becomes a no-op.

1. Create a Firebase project and run `dart pub global activate flutterfire_cli && flutterfire configure` inside `client-flow-mobile` (generates `lib/firebase_options.dart`, `android/app/google-services.json`, `ios/Runner/GoogleService-Info.plist` — all git-ignored), then pass the generated options to `Firebase.initializeApp` in `lib/features/push/firebase_push_service.dart`.
2. On iOS enable *Push Notifications* + *Background Modes → Remote notifications* in Xcode and upload the APNs key to Firebase.
3. **Backend change required:** update the `send-push-notification` Edge Function to send through the FCM HTTP v1 API instead of `https://exp.host/--/api/v2/push/send`, keeping the same `data` payload (`document_id` / `request_id`) — the app deep-links on tap using those keys.
4. The Database Webhook on `notifications` → `send-push-notification` stays as documented in `client-flow-main`.

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
