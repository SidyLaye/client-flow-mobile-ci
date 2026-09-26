# ComptaFlow / A2T Expertise — un seul backend pour le desktop et le mobile

Le **backend Django REST** ([`comptaflow-backend`](https://github.com/SidyLaye/comptaflow-backend), déployé sur `https://test.allinone.ovh`)
sert les deux applications :

| Application | Utilisateurs | API |
|---|---|---|
| Desktop (`desktop/`, React + Tauri) | le cabinet : owner, admin, comptable, collaborateur, lecture seule | `/api/v1/…` + en-tête `X-Entrepreneur-Id` |
| Mobile (`../mobile`, Flutter) | les clients du cabinet | `/api/v1/client-portal/…` (sans en-tête cabinet) |

Supabase n'est plus utilisé.

## Authentification (commune)

| Méthode | Chemin | Corps | Réponse |
|---|---|---|---|
| POST | `/api/v1/auth/login/` | `{ email, password }` | `{ access, refresh }` (10 essais/min/IP) |
| POST | `/api/v1/auth/token/refresh/` | `{ refresh }` | `{ access, refresh }` (le refresh tourne) |
| POST | `/api/v1/auth/logout/` | `{ refresh }` | 205 |
| POST | `/api/v1/auth/password/change/` | `{ old_password, new_password }` | `{ detail }` |

Access token : 30 min. Refresh : 7 jours. Un compte suspendu ou dont le mot de
passe a été réinitialisé est coupé immédiatement (refresh tokens révoqués).

## Accès des clients à l'application mobile (côté cabinet)

Owner / admin / comptable uniquement. Écran : fiche client → onglet **Accès application**.

| Méthode | Chemin | Effet |
|---|---|---|
| GET | `/api/v1/clients/<id>/access/` | état : `has_access`, `email`, `is_active`, `last_login` |
| POST | `/api/v1/clients/<id>/access/` | crée le compte `{ email?, password? }` → renvoie `password` **une seule fois** (généré si vide) |
| POST | `/api/v1/clients/<id>/access/reset-password/` | nouveau mot de passe `{ password? }`, sessions coupées |
| POST | `/api/v1/clients/<id>/access/suspend/` | bloque la connexion, sessions coupées |
| POST | `/api/v1/clients/<id>/access/activate/` | réautorise |
| DELETE | `/api/v1/clients/<id>/access/` | supprime l'accès (compte désactivé, données conservées) |

Une adresse déjà utilisée par un autre compte est refusée (409) : on ne rattache
jamais un compte existant à un client.

## API du client (mobile)

Toutes les routes sont limitées au client connecté.

| Méthode | Chemin | Détail |
|---|---|---|
| GET | `/api/v1/client-portal/me/` | `{ user, client }` (+ `client.cabinet_name`) |
| GET | `/api/v1/client-portal/summary/` | `open_requests`, `pending_documents`, `unread_notifications`, `unread_messages` |
| GET | `/api/v1/client-portal/documents/` | `?status=&category=&document_request=` — documents visibles |
| GET | `/api/v1/client-portal/documents/<id>/` | détail (jamais le commentaire interne) |
| GET | `/api/v1/client-portal/documents/<id>/download/` | fichier (JWT requis) |
| POST | `/api/v1/client-portal/documents/upload/` | multipart : `file`, `title?`, `category?`, `client_comment?`, `document_request?`, `period_month?`, `period_year?` — 25 Mo max, PDF/images/Office/CSV/TXT |
| GET | `/api/v1/client-portal/requests/` | `?status=open` ou un statut |
| GET | `/api/v1/client-portal/requests/<id>/` | détail ; passe la demande de *envoyée* à *vue* |
| GET | `/api/v1/client-portal/messages/` | page la plus récente d'abord ; `?since=<ISO>` → nouveaux messages (ordre chronologique) |
| POST | `/api/v1/client-portal/messages/` | `{ body }` |
| POST | `/api/v1/client-portal/messages/<id>/read/`, `…/mark-all-read/` | accusé de lecture des messages du cabinet |
| GET | `/api/v1/client-portal/invoices/`, `…/<id>/`, `…/<id>/pdf/` | factures envoyées au client |
| GET | `/api/v1/client-portal/notifications/` | `?unread=1` |
| POST | `/api/v1/client-portal/notifications/<id>/read/`, `…/mark-all-read/` | |
| POST / DELETE | `/api/v1/client-portal/push-tokens/` | `{ token, platform, device_name }` / `{ token }` |

Catégories : `purchase_invoice`, `sales_invoice`, `bank_statement`, `contract`,
`id_document`, `rib`, `tax_document`, `other`.

## Règles métier automatiques

- Le client envoie une pièce en réponse à une demande → la demande passe à
  *partiellement complétée* et le cabinet reçoit une notification.
- Le client ouvre une demande → *vue*.
- Le cabinet crée ou relance une demande, écrit un message non interne, refuse
  ou marque incomplet un document → le client reçoit une notification (avec le
  motif saisi dans « Motif envoyé au client », jamais le commentaire interne).
- Le client écrit → le comptable assigné (sinon owners/admins/comptables) est notifié.
- Les fichiers ne sont jamais publics : ils passent par les routes `…/download/`.

## Notifications push

- Chaque notification créée pour un utilisateur qui a enregistré un téléphone
  (`/client-portal/push-tokens/`) est envoyée par une tâche Celery via
  **FCM HTTP v1**, après validation de la transaction. Elle s'affiche même
  application fermée ; un appui ouvre le document ou la demande
  (`data.link`, `data.notification_id`).
- Les jetons que FCM déclare invalides sont supprimés automatiquement.
- Activation côté serveur : variable `FCM_CREDENTIALS` = JSON du compte de
  service Firebase (sur une ligne, ou chemin d'un fichier). Vide = push
  désactivé, les notifications restent visibles dans les applications.
- Le desktop ne reçoit pas de push : il relit `/api/v1/notifications/` toutes
  les 15 s et affiche une notification Windows pour chaque nouvelle entrée.

