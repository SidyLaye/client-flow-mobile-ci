<![CDATA[# ComptaFlow — Accounting Office Management Platform

> A full-stack web application for French accounting firms (_cabinets comptables_) to manage clients, documents, invoices, tasks, deadlines, and messaging — built with **React + TypeScript** on the frontend and **Supabase** (PostgreSQL, Auth, Edge Functions, Storage) as the entire backend.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Backend Deep Dive (Supabase)](#backend-deep-dive-supabase)
  - [Database Schema](#database-schema)
  - [Row-Level Security (RLS)](#row-level-security-rls)
  - [Edge Functions (Serverless API)](#edge-functions-serverless-api)
  - [Storage Buckets](#storage-buckets)
  - [Authentication Flow](#authentication-flow)
- [Frontend Architecture](#frontend-architecture)
  - [Routing & Navigation](#routing--navigation)
  - [State Management](#state-management)
  - [UI Component System](#ui-component-system)
  - [PDF Generation](#pdf-generation)
- [Application Modules](#application-modules)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Desktop App (Tauri)](#desktop-app-tauri)
- [Testing](#testing)
- [License](#license)

---

## Overview

**ComptaFlow** is a SaaS-style back-office designed for accounting professionals in France. It provides:

- **Client Management** — CRUD for companies with French-specific fields (SIREN, SIRET, VAT regime, fiscal year).
- **Document Lifecycle** — Upload, review, validate/reject documents with status tracking.
- **Document Requests** — Send requests to clients for missing documents with priority & reminders.
- **Invoicing** — Create invoices, quotes, and credit notes with line items, VAT calculation, discounts, partial payments, and PDF export.
- **Messaging** — Per-client conversations with internal (staff-only) notes.
- **Tasks & Deadlines** — Track accountant workload and regulatory deadlines (TVA, bilan, liasse fiscale).
- **Notifications** — Real-time notification system for documents, messages, and deadlines.
- **Audit Logging** — Every sensitive action is logged for compliance.
- **Multi-tenant isolation** — Each admin only sees their own clients (scoped RLS policies).

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript | UI rendering & type safety |
| **Build Tool** | Vite 5 (SWC plugin) | Fast dev server & bundling |
| **Routing** | React Router DOM v6 | Client-side routing with protected routes |
| **Server State** | TanStack React Query v5 | Data fetching, caching, and synchronization |
| **UI Components** | shadcn/ui (Radix UI primitives) | 49 accessible, composable UI components |
| **Styling** | Tailwind CSS 3 + CSS Variables | Utility-first styling with HSL design tokens |
| **Forms** | React Hook Form + Zod | Performant forms with schema validation |
| **Charts** | Recharts | Dashboard data visualization |
| **PDF Generation** | jsPDF + jsPDF-AutoTable | Client-side invoice PDF creation |
| **Icons** | Lucide React | Consistent iconography |
| **Toasts** | Sonner | Notification toasts |
| **Backend (BaaS)** | Supabase | Auth, PostgreSQL, Edge Functions, Storage |
| **Edge Functions** | Deno (TypeScript) | Serverless API endpoints |
| **Desktop** | Tauri v2 (Rust) | Optional native desktop wrapper |
| **Testing** | Vitest + Testing Library + Playwright | Unit, component, and E2E tests |
| **Linting** | ESLint 9 (flat config) | Code quality |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser / Tauri)                 │
│  ┌───────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────┐  │
│  │ React SPA │──│ React Query  │──│ Supabase │──│ Auth      │  │
│  │ (Vite)    │  │ (Cache)      │  │ JS Client│  │ Context   │  │
│  └───────────┘  └──────────────┘  └────┬─────┘  └───────────┘  │
└────────────────────────────────────────┼────────────────────────┘
                                         │ HTTPS
┌────────────────────────────────────────┼────────────────────────┐
│                     SUPABASE CLOUD                              │
│  ┌─────────────┐  ┌───────────────┐  ┌┴────────────────────┐   │
│  │ Auth        │  │ Edge Functions│  │ PostgREST            │   │
│  │ (GoTrue)    │  │ (Deno Deploy) │  │ (Auto-generated API) │   │
│  └──────┬──────┘  └───────┬───────┘  └──────────┬───────────┘   │
│         │                 │                     │               │
│  ┌──────┴─────────────────┴─────────────────────┴───────────┐   │
│  │                   PostgreSQL Database                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │   │
│  │  │ RLS      │ │ Triggers │ │ Functions│ │ Migrations  │  │   │
│  │  │ Policies │ │          │ │ (plpgsql)│ │ (5 files)   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │   │
│  └───────────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                   Storage (S3-compatible)                 │   │
│  │  client-documents │ invoice-pdfs │ message-attachments    │   │
│  │  cabinet-assets (public)                                  │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

1. **No custom backend server** — Supabase provides Auth, database (PostgREST auto-API), Storage, and Edge Functions, eliminating the need for Express/Fastify.
2. **Edge Functions for privileged operations** — Actions that require `service_role` access (creating users, cross-table transactions) run as Deno serverless functions.
3. **Direct PostgREST for reads** — The Supabase JS client queries tables directly; RLS policies enforce authorization at the database level.
4. **Client-side PDF** — Invoice PDFs are generated in-browser using jsPDF, avoiding server-side rendering costs.

---

## Project Structure

```
client-flow-main/
├── index.html                    # SPA entry point
├── package.json                  # Dependencies & scripts
├── vite.config.ts                # Vite configuration (port 8080, SWC)
├── tailwind.config.ts            # Tailwind with HSL design tokens
├── components.json               # shadcn/ui configuration
├── tsconfig.json                 # TypeScript project references
├── vitest.config.ts              # Vitest test configuration
├── playwright.config.ts          # Playwright E2E configuration
├── .env                          # Supabase connection credentials
│
├── src/
│   ├── main.tsx                  # React DOM entry point
│   ├── App.tsx                   # Root component (providers + router)
│   ├── index.css                 # Global styles, CSS variables, Tailwind
│   ├── App.css                   # App-level styles
│   │
│   ├── pages/                    # Route-level page components (17 pages)
│   │   ├── LoginPage.tsx         # Authentication page
│   │   ├── Dashboard.tsx         # Overview with stats & widgets
│   │   ├── ClientsList.tsx       # Client directory with search/filter
│   │   ├── CreateClient.tsx      # Client creation form
│   │   ├── ClientDetail.tsx      # Client profile with tabs
│   │   ├── DocumentsList.tsx     # Document management
│   │   ├── DocumentDetail.tsx    # Document review interface
│   │   ├── RequestsList.tsx      # Document request tracking
│   │   ├── MessagesList.tsx      # Client messaging center
│   │   ├── TasksList.tsx         # Task management board
│   │   ├── DeadlinesList.tsx     # Regulatory deadline tracker
│   │   ├── InvoicesList.tsx      # Invoice/quote/credit note list
│   │   ├── CreateInvoice.tsx     # Invoice creation with line items
│   │   ├── InvoiceDetail.tsx     # Invoice detail with payments
│   │   ├── SettingsPage.tsx      # Firm configuration
│   │   └── NotFound.tsx          # 404 page
│   │
│   ├── components/
│   │   ├── AppLayout.tsx         # Sidebar + TopBar + Outlet layout
│   │   ├── AppSidebar.tsx        # Navigation sidebar (9 nav items)
│   │   ├── TopBar.tsx            # Search, notifications, user menu
│   │   ├── ProtectedRoute.tsx    # Auth guard (redirects to /login)
│   │   ├── NavLink.tsx           # Active-aware navigation link
│   │   ├── client/               # Client-specific components
│   │   │   └── ClientAccessTab.tsx
│   │   └── ui/                   # 49 shadcn/ui components
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       # Supabase Auth state provider
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx        # Responsive breakpoint hook
│   │   └── use-toast.ts          # Toast notification hook
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # Supabase client initialization
│   │       └── types.ts          # Auto-generated database types (917 lines)
│   │
│   ├── lib/
│   │   ├── utils.ts              # cn() classname merge utility
│   │   ├── mock-data.ts          # Development mock data & type definitions
│   │   └── generate-invoice-pdf.ts  # jsPDF invoice generator
│   │
│   └── test/
│       ├── setup.ts              # Vitest test setup
│       └── example.test.ts       # Example test
│
├── supabase/
│   ├── config.toml               # Supabase project config
│   ├── migrations/               # 5 SQL migration files
│   │   ├── 20260414145640_*.sql  # Initial schema (14 tables + RLS + storage)
│   │   ├── 20260414145651_*.sql  # Restrict public cabinet-assets access
│   │   ├── 20260414150543_*.sql  # Fix client self-read policy
│   │   ├── 20260414151453_*.sql  # Multi-tenant admin scoping
│   │   └── 20260421071646_*.sql  # Document columns + storage policies
│   └── functions/                # 13 Deno Edge Functions + shared helpers
│       ├── _shared/helpers.ts    # Auth, CORS, audit, response utilities
│       ├── create-client/
│       ├── create-client-access/
│       ├── create-document-record/
│       ├── create-invoice/
│       ├── record-payment/
│       ├── reset-client-password/
│       ├── send-document-request/
│       ├── send-invoice/
│       ├── send-message/
│       ├── update-client-access-status/
│       ├── update-document-status/
│       ├── update-invoice/
│       └── validate-invoice/
│
└── src-tauri/                    # Tauri desktop app (Rust shell)
```

---

## Backend Deep Dive (Supabase)

### Database Schema

The PostgreSQL database contains **14 tables** organized into logical domains:

#### Identity & Access

| Table | Purpose |
|---|---|
| `user_roles` | Maps `auth.users` → role (`admin` or `client`) |
| `profiles` | User profile data (name, username, phone). Auto-created on signup via trigger. |
| `client_accounts` | Links a `client` record to an `auth.user`, controlling portal access (mobile/web). |

#### Core Business

| Table | Purpose |
|---|---|
| `clients` | Company records with French fields: SIREN, SIRET, VAT number, legal form, tax/VAT regime, fiscal year end. |
| `documents` | Uploaded files with status workflow: `received → under_review → validated/rejected/incomplete → archived`. |
| `document_requests` | Requests sent to clients for missing documents, with priority and status tracking. |
| `messages` | Per-client messaging with `is_internal` flag for staff-only notes. Supports links to related documents/requests. |

#### Invoicing

| Table | Purpose |
|---|---|
| `invoices` | Invoices, quotes (`devis`), and credit notes (`avoir`). Full lifecycle: `draft → validated → sent → viewed → paid`. Tracks HT/TTC/VAT/discounts. |
| `invoice_items` | Line items with quantity, unit price, discount %, VAT rate, and computed totals. |
| `invoice_payments` | Payment records supporting partial payments with method, reference, and notes. |

#### System

| Table | Purpose |
|---|---|
| `notifications` | User notifications linked to clients, documents, invoices, or messages. |
| `settings` | Firm-level configuration: company info, bank details (IBAN/BIC), invoice/quote/credit note prefixes, default terms, late penalty rates. |
| `audit_logs` | Immutable action log with user ID, action type, entity reference, and JSON metadata. |

#### Database Functions & Triggers

```sql
-- Auto-update timestamps on row modification
update_updated_at_column()  -- BEFORE UPDATE trigger on 8 tables

-- Role checking (used in RLS policies)
has_role(_user_id UUID, _role app_role) → BOOLEAN

-- Multi-tenant scoping
admin_owns_client(_client_id UUID) → BOOLEAN

-- Auto-create profile on user signup
handle_new_user() → TRIGGER on auth.users INSERT
```

#### Entity Relationship Diagram

```
auth.users ──┬── profiles (1:1)
             ├── user_roles (1:N)
             └── client_accounts (1:1)
                      │
                   clients ──┬── documents ──── document_requests
                             ├── document_requests
                             ├── messages
                             ├── invoices ──┬── invoice_items
                             │              └── invoice_payments
                             └── notifications
```

---

### Row-Level Security (RLS)

Every table has RLS enabled. The security model enforces two roles:

#### Admin Role
- **Scoped to assigned clients** — Admins can only access records belonging to clients where `assigned_admin_id = auth.uid()`.
- The `admin_owns_client()` function is used in policies for documents, invoices, messages, requests, and client accounts.
- Audit logs and settings are admin-only but not client-scoped.

#### Client Role
- Clients can read their own profile, client record, and visible documents/invoices.
- Clients can insert documents and messages (non-internal only).
- Internal messages (`is_internal = true`) are hidden from clients.
- Documents/invoices must have `visible_to_client = true` to appear.

#### Policy Evolution (Migrations)
1. **Initial** — Broad `has_role('admin')` policies.
2. **Migration 3** — Introduced `assigned_admin_id` column and `admin_owns_client()` for multi-tenant isolation.
3. **Migration 5** — Extended storage policies for admin-scoped file access.

---

### Edge Functions (Serverless API)

Edge Functions run on **Deno Deploy** and handle operations that require `service_role` privileges (e.g., creating auth users, cross-table transactions). All 13 functions follow a consistent pattern:

```typescript
// Every Edge Function follows this pattern:
Deno.serve(async (req) => {
  const cors = handleCors(req);       // 1. Handle CORS preflight
  if (cors) return cors;

  const auth = await requireAdmin(req.headers.get("Authorization")); // 2. Verify JWT + admin role
  if (auth.error) return auth.error;

  const body = await req.json();       // 3. Parse request body
  // ... validation ...                // 4. Validate inputs
  const service = getServiceClient();  // 5. Get service_role client
  // ... database operations ...       // 6. Execute business logic
  await writeAuditLog(...);            // 7. Log action for compliance
  return jsonResponse({ ... });        // 8. Return JSON response
});
```

#### Shared Helpers (`_shared/helpers.ts`)

| Helper | Purpose |
|---|---|
| `getServiceClient()` | Creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (full DB access, bypasses RLS) |
| `getAuthClient(header)` | Creates a Supabase client with the user's JWT (respects RLS) |
| `requireAdmin(header)` | Validates JWT, extracts user ID, verifies admin role in `user_roles` table |
| `writeAuditLog(...)` | Inserts a record into `audit_logs` with action, entity type/ID, and metadata |
| `handleCors(req)` | Returns preflight response for `OPTIONS` requests |
| `jsonResponse(body, status)` | Wraps response with CORS headers and JSON content type |

#### Function Catalog

| Function | Method | Description |
|---|---|---|
| `create-client` | POST | Creates a new client record with all French business fields |
| `create-client-access` | POST | Creates an auth user + profile + role + client_account link (with rollback on failure) |
| `create-document-record` | POST | Registers a document metadata record after file upload |
| `create-invoice` | POST | Creates invoice/quote/credit note with line items in a transaction |
| `update-invoice` | POST | Updates invoice details and recalculates totals |
| `validate-invoice` | POST | Transitions invoice from draft to validated, assigns number |
| `send-invoice` | POST | Marks invoice as sent, sets `visible_to_client = true`, creates client notification |
| `record-payment` | POST | Records a payment, updates invoice `amount_paid`/`amount_due`/`payment_status` |
| `send-document-request` | POST | Creates a document request and notifies the client |
| `send-message` | POST | Sends a message in a client conversation |
| `update-document-status` | POST | Changes document status (validate, reject, mark incomplete) |
| `update-client-access-status` | POST | Activates, suspends, or disables a client portal account |
| `reset-client-password` | POST | Resets a client's auth password via admin action |

---

### Storage Buckets

| Bucket | Visibility | Purpose |
|---|---|---|
| `client-documents` | Private | Client-uploaded documents (organized by `{client_id}/`) |
| `invoice-pdfs` | Private | Generated invoice PDFs (organized by `{client_id}/`) |
| `message-attachments` | Private | File attachments in messages |
| `cabinet-assets` | Public (restricted) | Firm logos and settings assets (restricted to `settings/` folder) |

Storage policies mirror the RLS pattern: admins access files for their assigned clients, clients access files in their own folder.

---

### Authentication Flow

```
┌──────────────┐     signInWithPassword()      ┌──────────────┐
│  LoginPage   │ ─────────────────────────────► │ Supabase Auth│
│  (email/pw)  │ ◄───────────────────────────── │  (GoTrue)    │
│              │     JWT + Session              │              │
└──────┬───────┘                                └──────────────┘
       │
       ▼
┌──────────────┐     onAuthStateChange()
│ AuthContext   │ ──── Subscribes to auth events
│ (Provider)    │ ──── Stores session/user in React state
│              │ ──── Exposes signIn/signOut methods
└──────┬───────┘
       │
       ▼
┌──────────────┐     Checks session != null
│ProtectedRoute│ ──── If null → Navigate to /login
│  (Guard)     │ ──── If loading → Spinner
│              │ ──── If valid → Render children
└──────────────┘
```

The Supabase client is configured with:
- `localStorage` for session persistence
- `persistSession: true` — survives page reloads
- `autoRefreshToken: true` — automatically refreshes expired JWTs

---

## Frontend Architecture

### Routing & Navigation

The app uses React Router v6 with a nested layout pattern:

```
/login              → LoginPage (public)
/                   → Dashboard (protected)
/clients            → ClientsList
/clients/nouveau    → CreateClient
/clients/:id        → ClientDetail
/documents          → DocumentsList
/documents/:id      → DocumentDetail
/demandes           → RequestsList
/messages           → MessagesList
/taches             → TasksList
/echeances          → DeadlinesList
/factures           → InvoicesList
/factures/nouveau   → CreateInvoice
/factures/:id       → InvoiceDetail
/parametres         → SettingsPage
*                   → NotFound (404)
```

All protected routes are wrapped in `<ProtectedRoute>` → `<AppLayout>`. The `AppLayout` component provides the persistent sidebar + top bar shell with an `<Outlet>` for page content.

### State Management

| Concern | Solution |
|---|---|
| Auth state | `AuthContext` (React Context + `onAuthStateChange` subscription) |
| Server state | TanStack React Query (fetching, caching, invalidation) |
| Form state | React Hook Form (uncontrolled inputs for performance) |
| UI state | Local `useState` within components |

### UI Component System

The project uses **shadcn/ui** — a collection of 49 copy-paste Radix UI components styled with Tailwind CSS. Components live in `src/components/ui/` and include:

Accordion, Alert Dialog, Alert, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, Context Menu, Dialog, Drawer, Dropdown Menu, Form, Hover Card, Input OTP, Input, Label, Menubar, Navigation Menu, Pagination, Popover, Progress, Radio Group, Resizable, Scroll Area, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toast, Toggle Group, Toggle, Tooltip.

#### Design Token System

Colors use HSL CSS variables enabling light/dark theme support:

```css
--primary: 217 71% 45%;      /* Blue accent */
--destructive: 0 72% 51%;    /* Red for errors */
--success: 142 71% 35%;      /* Green for success */
--warning: 38 92% 50%;       /* Amber for warnings */
--info: 199 89% 48%;         /* Cyan for info */
```

The sidebar uses a separate dark color scheme (`--sidebar-background: 220 20% 14%`) that remains dark regardless of the main theme.

### PDF Generation

Invoice PDFs are generated **entirely client-side** using `jsPDF` + `jsPDF-AutoTable`:

- **A4 format** with 18mm margins
- **Professional layout**: accent color header bar, company info, client block, items table, totals section, bank details, and legal footer
- **VAT breakdown** by rate with proper French formatting (`Intl.NumberFormat` with `fr-FR` locale)
- **Credit note support** with linked original invoice reference
- **Partial payment tracking** showing "Déjà réglé" and "Reste à payer"

---

## Application Modules

### Dashboard
Displays 6 KPI stat cards (active clients, missing documents, late requests, unread messages, pending tasks, urgent deadlines) plus 4 widget cards showing upcoming deadlines, priority tasks, document requests, and latest messages.

### Clients
Full CRUD with French-specific fields: company name, SIREN/SIRET, VAT number, legal form, business activity, tax regime, VAT regime/frequency, fiscal year end. Client detail page includes tabbed sections with access management (create portal account, reset password, suspend access).

### Documents
Upload, categorize, and review documents with a 6-stage workflow: received → under review → validated / rejected / incomplete → archived. Supports period tagging (month/year), internal comments, and client visibility toggling.

### Invoicing
Create invoices, quotes, and credit notes with multi-line items. Each item supports quantity, unit, unit price (HT), discount %, and VAT rate. Automatic calculation of subtotal HT, total discount, total VAT, and total TTC. Payment recording with partial payment support. PDF export.

### Messaging
Per-client conversation threads with support for internal notes (visible only to staff). Messages can be linked to specific documents or requests for context.

### Tasks & Deadlines
Task board with status (to do, in progress, blocked, done) and priority levels. Deadline tracker for regulatory obligations (TVA, bilan annuel, liasse fiscale) with status tracking.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm**, **bun**, or **pnpm**
- A **Supabase** project (free tier works)
- _(Optional)_ **Rust toolchain** for Tauri desktop builds

### Installation

```bash
# Clone the repository
git clone https://github.com/derradji-mourad/sentiment-analysis-twitter.git
cd client-flow-main

# Install dependencies
npm install
# or
bun install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
```

These values come from your Supabase project dashboard → Settings → API.

### Database Setup

Apply migrations to your Supabase project:

```bash
# Install Supabase CLI
npx supabase login
npx supabase link --project-ref your-project-id

# Apply all migrations
npx supabase db push
```

### Deploy Edge Functions

```bash
# Deploy all functions at once
npx supabase functions deploy

# Or deploy individually
npx supabase functions deploy create-client
npx supabase functions deploy create-client-access
npx supabase functions deploy send-invoice
# ... etc
```

### Running Locally

```bash
# Start dev server (port 8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Deployment

The frontend is a static SPA that can be deployed to any static hosting:

| Platform | Command |
|---|---|
| **Vercel** | `npm run build` → deploy `dist/` |
| **Netlify** | Build command: `npm run build`, publish: `dist/` |
| **Cloudflare Pages** | Build command: `npm run build`, output: `dist/` |

> **Important:** Set the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in your hosting platform's dashboard.

For SPA routing, configure a redirect rule so all paths serve `index.html`:

```
/* → /index.html  (200)
```

---

## Desktop App (Tauri)

The project includes a Tauri v2 configuration for building a native desktop app:

```bash
# Development
npm run tauri:dev

# Production build
npm run tauri:build
```

**Requirements:** Rust toolchain (`rustup`), platform-specific build tools (Visual Studio Build Tools on Windows, Xcode on macOS).

---

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests (Playwright)
npx playwright test
```

The project uses:
- **Vitest** for unit/component tests with `jsdom` environment
- **Testing Library** for React component testing
- **Playwright** for end-to-end browser tests

---

## License

This project is private and proprietary.
]]>
