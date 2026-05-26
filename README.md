# ComptaFlow Client — Mobile App

React Native (Expo) companion app for the **client side** of [ComptaFlow](../client-flow-main). Clients sign in with credentials issued by their accountant (*comptable*) and can scan, upload, and message documents straight from their phone.

## Features

- **Login** with the email/password issued by the accounting firm. Sessions are restored on app launch (Supabase Auth + AsyncStorage).
- **Home** — quick overview of open requests, pending documents, and unread notifications.
- **Documents** — list visible documents with status badges; tap to open the file (signed URL → native share sheet).
- **Document requests** — see what the accountant is asking for, with priorities, due dates, and a one-tap "Reply with a document" CTA.
- **Scan to PDF** (CamScanner-style) — native edge detection + perspective correction (VisionKit on iOS / ML Kit on Android via `react-native-document-scanner-plugin`), multi-page capture, library/file picker fallback, and PDF generation via `expo-print`.
- **Push notifications** — `expo-notifications` registers an Expo push token per device; the Supabase Edge Function `send-push-notification` is wired to `notifications` table inserts via a Database Webhook and ships pushes to all devices for the recipient.
- **Upload review** — name the file, pick a category, add a comment, and upload to the `client-documents` Supabase bucket. Metadata is registered through the `create-document-record` Edge Function (with a direct-insert fallback respecting the existing RLS policy).
- **Messaging** — per-client conversation, hides internal staff notes, realtime updates via Supabase channel.
- **Notifications** — list of recent notifications with realtime inserts and tap-to-mark-read.
- **Profile** — sign out.

## Project structure

```
client-flow-mobile/
├── App.tsx                       # Providers + NavigationContainer
├── app.json                      # Expo config (iOS/Android perms, plugins)
├── babel.config.js
├── tsconfig.json
├── .env.example
└── src/
    ├── lib/
    │   ├── supabase.ts           # Supabase client (AsyncStorage session)
    │   ├── pdf.ts                # Build PDF from images (expo-print)
    │   └── theme.ts              # Colors / radius / spacing
    ├── contexts/
    │   └── AuthContext.tsx       # Session + client_account loader
    ├── navigation/
    │   ├── RootNavigator.tsx     # Auth gate + stack
    │   └── MainTabs.tsx          # 5 bottom tabs
    └── screens/
        ├── LoginScreen.tsx
        ├── HomeScreen.tsx
        ├── DocumentsScreen.tsx
        ├── DocumentDetailScreen.tsx
        ├── RequestsScreen.tsx
        ├── RequestDetailScreen.tsx
        ├── ScanDocumentScreen.tsx
        ├── UploadReviewScreen.tsx
        ├── MessagesScreen.tsx
        └── ProfileScreen.tsx
```

## How it integrates with the existing backend

This app reuses the **same Supabase project** as `client-flow-main`. Nothing new on the backend side is required because:

- The `clients` table already exposes a `Clients can read own client record` RLS policy (joins via `client_accounts`).
- The `documents` table already allows clients to `INSERT` rows for their own client and to `SELECT` rows where `visible_to_client = true`.
- Storage bucket `client-documents` is partitioned by `{client_id}/...`, which is the path used by the upload flow.
- The `messages` and `notifications` tables already support per-client realtime via `client_id` / `user_id` filters.
- The Edge Function `create-document-record` is invoked when present; otherwise the app falls back to a direct insert, both of which are RLS-checked.

> The accountant creates the client portal account from the web app (`create-client-access` Edge Function). That flow provisions the `auth.users`, `profiles`, role, and `client_accounts` rows — the mobile app does **not** need any signup screen.

## Getting started

```bash
cd client-flow-mobile
npm install              # or: bun install
cp .env.example .env     # fill in your Supabase URL + anon key
npm run start            # opens Expo dev tools — scan QR with Expo Go, or run on simulator
```

### Env vars

The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (matches Expo's public env convention). They must be the same values used by the web app — see `client-flow-main/.env`.

### Permissions

`app.json` already declares the required permissions and prompts:

- iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`
- Android: `CAMERA`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`

### EAS dev client (required)

The native document scanner and push notifications both ship native code, so **the app no longer runs in plain Expo Go**. Use an EAS *dev client* during development:

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform ios       # or android
# Install the resulting build on your device, then:
npm run start --dev-client
```

For TestFlight / Play Console builds:

```bash
eas build --platform ios
eas build --platform android
```

### Push notification setup (one-time, on the backend)

1. **Apply the new migration** that creates `push_tokens`:
   ```bash
   cd ../client-flow-main
   npx supabase db push
   ```
2. **Deploy the new Edge Function** that ships push messages:
   ```bash
   npx supabase functions deploy send-push-notification
   ```
3. *(Optional)* Set an Expo access token if you want enhanced delivery receipts:
   ```bash
   npx supabase secrets set EXPO_ACCESS_TOKEN=<token from expo.dev>
   ```
4. **Configure a Database Webhook** in the Supabase dashboard:
   - Database → Webhooks → *Create a new hook*
   - Table: `notifications`
   - Events: `Insert`
   - Type: *Supabase Edge Functions* → select `send-push-notification`
   - HTTP method: `POST`

   Once enabled, every row inserted into `notifications` (by any of the existing edge functions like `send-document-request`, `send-message`, `send-invoice`) will fan out to every registered device for the target user.

5. **Permission prompt on the phone:** the first sign-in triggers `Notifications.requestPermissionsAsync()`. If the user denies it, run the device's Settings → ComptaFlow Client → Notifications to re-enable.

## Notes / known caveats

- The base64-to-bytes helper in `UploadReviewScreen.tsx` avoids pulling in a `Buffer` polyfill. Replace it with a polyfill if you ever need to upload very large files.
- Push tokens are device-scoped: a user signing in on a second phone registers a second token, and both phones receive the same notifications. Sign-out cleans up the token only on the device the user signed out of (intentional — the other phone is still authed).
- `react-native-document-scanner-plugin` requires a real device/simulator with camera support. iOS simulators without a camera will fall through to the gallery / file pickers.
