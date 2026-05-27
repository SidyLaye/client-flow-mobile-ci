# ComptaFlow — API surface for the client-side mobile app

This document describes everything the **`client-flow-mobile` app**
(end-clients of the cabinet: business owners, freelancers, small companies)
must consume from the Django REST backend.

The current Tauri desktop app is for **cabinet admins** (role `admin` or
`accountant` on an `Entrepreneur`). The mobile app is for **clients** of
the cabinet (`Client` records, plus optional auth users linked via the
client-access mechanism).

Backend base URL: `http://localhost:8000` in dev. In production, expose your
Django server behind HTTPS and point the mobile at `https://api.your-domain.fr`.

---

## 1. Auth flow

All endpoints under `/api/v1/auth/` use JWT (SimpleJWT). The mobile app stores
both tokens in secure storage (Keychain / Keystore) and includes
`Authorization: Bearer <access>` on every request.

| Method | Path | Body | Returns | Used for |
|---|---|---|---|---|
| POST | `/api/v1/auth/login/` | `{ email, password }` | `{ access, refresh }` | Login screen |
| POST | `/api/v1/auth/register/` | `{ email, password, password_confirm, first_name?, last_name?, phone? }` | `{ user, tokens }` | (Cabinet desktop only — clients are typically pre-provisioned by the cabinet) |
| POST | `/api/v1/auth/token/refresh/` | `{ refresh }` | `{ access, refresh? }` | Silent token refresh on 401 |
| GET | `/api/v1/auth/me/` | — | `{ user, roles }` | Hydrate the profile at app boot |
| POST | `/api/v1/auth/logout/` | `{ refresh }` | 204 | Sign-out button |
| POST | `/api/v1/auth/password/change/` | `{ old_password, new_password }` | `{ detail }` | "Change password" |

The `roles` array in `/auth/me/` tells the mobile app which `Entrepreneur`
(tenant) the user belongs to. Most client accounts will have exactly one entry
with `role = 'client'`. After login, store `entrepreneur` from the first
active role and send it on every protected call as the header
`X-Entrepreneur-Id`.

---

## 2. Tenant header on every request

Every protected endpoint requires:

```
Authorization: Bearer <access JWT>
X-Entrepreneur-Id: <UUID from auth/me roles[].entrepreneur>
```

Exceptions: `/auth/*` and `/entrepreneurs/` accept requests without the
tenant header.

---

## 3. Endpoints the mobile client app uses

### Client's own record
```
GET /api/v1/clients/<my-client-id>/        → my company info
PATCH /api/v1/clients/<my-client-id>/      → update only fields the cabinet allows
```
The client's own id is reachable from `/auth/me/` (the role linked to a client
account exposes it). Backend RLS enforces scope.

### Documents
```
GET /api/v1/documents/?period_year=&period_month=&category=
   → returns Paginated<Document> with files visible_to_client=true
GET /api/v1/documents/<id>/                → single doc metadata
GET /api/v1/documents/<id>/download/       → binary stream (authenticated)
POST /api/v1/documents/                    → upload a file (multipart/form-data)
   fields: file, file_name, client, document_request?, category?, period_year?, period_month?
```

The mobile sends documents in response to a request:

```ts
const fd = new FormData();
fd.append("file", fileBlob);
fd.append("file_name", "facture-mars.pdf");
fd.append("client", myClientId);
fd.append("document_request", requestId);
fd.append("category", "achat");
fetch(`${API_URL}/api/v1/documents/`, {
  method: "POST",
  headers: { Authorization: `Bearer ${access}`, "X-Entrepreneur-Id": tenantId },
  body: fd,
});
```

### Document requests (read-only for client)
```
GET /api/v1/document-requests/?status=     → list of pieces requested by the cabinet
GET /api/v1/document-requests/<id>/        → single request detail
```

### Messages
```
GET /api/v1/messages/?client=<my-client-id>            → conversation thread
POST /api/v1/messages/                                  → send a message
   body: { client, body, is_internal: false }
POST /api/v1/messages/<id>/read/                        → mark one as read
POST /api/v1/messages/mark-all-read/                    → mark all in thread
   body: { client }
```

The mobile NEVER sets `is_internal: true` — the backend rejects it for client
users.

### Invoices (read-only)
```
GET /api/v1/invoices/?status=                           → list of invoices the cabinet issued
GET /api/v1/invoices/<id>/                              → single invoice
GET /api/v1/invoices/<id>/pdf/                          → PDF stream
```

### Notifications
```
GET /api/v1/notifications/                              → recent notifications for the user
PATCH /api/v1/notifications/<id>/read/                  → mark single as read
POST /api/v1/notifications/mark-all-read/               → mark all as read
```

### Dashboard summary (optional)
```
GET /api/v1/dashboard/summary/                          → KPI cards (counts)
```

---

## 4. Suggested mobile screen → API mapping

| Screen | Reads | Writes |
|---|---|---|
| Login | `POST /auth/login/` | — |
| App boot | `GET /auth/me/`, `GET /notifications/?is_read=false` | — |
| Home / dashboard | `GET /dashboard/summary/`, `GET /document-requests/?status=sent` (open count), `GET /messages/?client=me` (unread count) | PATCH notification read |
| Documents requested | `GET /document-requests/?status=sent` | `POST /documents/` (multipart) |
| My documents | `GET /documents/?visible_to_client=true` | — |
| Conversation | `GET /messages/?client=me` | `POST /messages/`, `POST /messages/mark-all-read/` |
| My invoices | `GET /invoices/?status=sent` | — |
| Invoice detail | `GET /invoices/<id>/`, `GET /invoices/<id>/pdf/` | — |
| Profile | `GET /clients/<my-client-id>/`, `GET /auth/me/` | `PATCH /clients/<my-client-id>/`, `POST /auth/password/change/` |
| Sign out | — | `POST /auth/logout/` |

---

## 5. Client-account provisioning (cabinet side)

The cabinet creates a mobile-app account for each of its clients via the
desktop "Créer accès client" workflow. **This is not yet wired to Django** —
`ClientAccessTab.tsx` currently keeps state locally only.

To make the cabinet provision real accounts, add a Django endpoint:

```
POST /api/v1/clients/<client-id>/access/
  body: { email, password, can_access_mobile, can_access_web }
  → creates a Django User with role='client' on the entrepreneur,
    links it to the Client via a ClientAccount row,
    returns { user_id, email }
```

Then in `src/lib/api.ts` add:

```ts
clientAccess: {
  create: (clientId: UUID, payload: { ... }) =>
    request<{ user_id: UUID }>(`/api/v1/clients/${clientId}/access/`, {
      method: "POST", body: payload,
    }),
  resetPassword: (clientId: UUID, newPassword: string) =>
    request<void>(`/api/v1/clients/${clientId}/access/reset-password/`, {
      method: "POST", body: { new_password: newPassword },
    }),
  // ... etc.
}
```

Then in `ClientAccessTab.tsx` swap the local `setAccess` for an `api.clientAccess.create(...)` call.

---

## 6. Running the Django backend locally

The mobile app needs the Django server reachable. From the project root:

```powershell
cd C:\Users\sarrs\Documents\mourad\a2t-expertise

# Option A — Docker (recommended)
docker compose up

# Option B — bare Python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

For the mobile to reach the server from your phone on the same Wi-Fi:

1. Find your machine's LAN IP (`ipconfig` → `IPv4 Address`, e.g. `192.168.1.42`).
2. Configure the mobile app's `API_URL` to `http://192.168.1.42:8000`.
3. Allow port 8000 through Windows Firewall.

For production, deploy Django behind nginx + HTTPS and point the mobile at the
public URL.

---

## 7. CORS

The Django backend must accept requests from the mobile app's origin (if it's
a web build of the mobile) and from `tauri://localhost` for the desktop. In
`a2t-expertise/config/settings/*.py` ensure:

```python
CORS_ALLOWED_ORIGINS = [
  "http://localhost:8080",     # vite dev
  "tauri://localhost",         # Tauri desktop
  # Add your mobile's origin if web-bundled
]
CORS_ALLOW_HEADERS = [..., "x-entrepreneur-id"]
```

For native mobile (iOS/Android via React Native/Flutter), CORS doesn't apply
— the OS handles the request, not a browser.

---

## 8. Connecting client-flow-mobile

Clone the mobile repo locally so the desktop and mobile share the same project
root:

```powershell
cd C:\Users\sarrs\Documents\mourad
git clone https://github.com/derradji-mourad/client-flow-mobile.git
```

Then in `client-flow-mobile`:

1. Find where the API base URL is configured (likely a `config.ts`, `.env`, or `services/api.ts` file). Set it to the same Django URL as the desktop (`http://192.168.1.42:8000` for LAN testing, `https://api.your-domain.fr` for prod).
2. Verify the JWT auth flow uses the same `/api/v1/auth/login/` endpoint.
3. Once a real client account exists (see section 5), test login on the mobile with those credentials.

Tell me when the mobile repo is cloned and I'll review the actual code to make sure the endpoints match what the cabinet desktop expects.

---

## 9. Known TODOs to make everything operational

- [ ] Wire `ClientAccessTab.tsx` to a real Django endpoint that creates a user with `role='client'` (section 5).
- [ ] Add a `clientAccess` group to `src/lib/api.ts` matching the new endpoint.
- [ ] Verify the Django backend exposes `/api/v1/dashboard/summary/` so both desktop and mobile show real KPIs.
- [ ] Confirm `documents.upload` accepts multipart and stores the file in `MEDIA_ROOT/client-documents/<client-id>/`.
- [ ] Test the full loop: cabinet creates a client → cabinet provisions an access → mobile logs in with that account → mobile uploads a doc → cabinet sees it.
- [ ] If you want real-time updates on the mobile (new requests, new messages), add Django Channels or expose a WebSocket — the current REST setup only supports polling.
