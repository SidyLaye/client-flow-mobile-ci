// Thin typed wrapper around fetch for the Django REST API.
// Handles JWT (access + refresh), the X-Entrepreneur-Id tenant header,
// and surfaces backend validation errors in a usable shape.

import type {
  AppNotification,
  Client,
  ClientCreatePayload,
  DashboardSummary,
  Deadline,
  DeadlineCreatePayload,
  DocumentItem,
  DocumentRequest,
  DocumentRequestCreatePayload,
  Entrepreneur,
  Invoice,
  InvoiceCreatePayload,
  JWTPair,
  LoginResponse,
  MeResponse,
  Message,
  MessageCreatePayload,
  Paginated,
  Quote,
  Task,
  TaskCreatePayload,
  UUID,
} from "./api-types";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

const ACCESS_KEY = "a2t.access";
const REFRESH_KEY = "a2t.refresh";
const ENTREPRENEUR_KEY = "a2t.entrepreneur_id";

// ─── token storage (sync, localStorage) ────────────────────────────────────

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: ({ access, refresh }: JWTPair) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const entrepreneurStore = {
  get: () => localStorage.getItem(ENTREPRENEUR_KEY),
  set: (id: string) => localStorage.setItem(ENTREPRENEUR_KEY, id),
  clear: () => localStorage.removeItem(ENTREPRENEUR_KEY),
};

// ─── error type ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function extractMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  // DRF field validation error: { field: ["msg"] } — show the first one.
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0] as string;
    if (typeof value === "string") return value;
  }
  return fallback;
}

// ─── core request ──────────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  // Skip Authorization (used by /login, /register, /token/refresh)
  anonymous?: boolean;
  // Skip the X-Entrepreneur-Id header (used by /entrepreneurs and /auth/*)
  noTenant?: boolean;
  signal?: AbortSignal;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        tokenStore.clear();
        return null;
      }
      const data = (await res.json()) as { access: string; refresh?: string };
      tokenStore.setAccess(data.access);
      // SimpleJWT with rotate=True returns a new refresh too.
      if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
      return data.access;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_URL}${path.startsWith("/") ? "" : "/"}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, anonymous = false, noTenant = false, signal } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      payload = body;
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  if (!anonymous) {
    const access = tokenStore.getAccess();
    if (access) headers.Authorization = `Bearer ${access}`;
  }
  if (!noTenant) {
    const ent = entrepreneurStore.get();
    if (ent) headers["X-Entrepreneur-Id"] = ent;
  }

  const url = buildUrl(path, query);
  let res = await fetch(url, { method, headers, body: payload, signal });

  // One-shot refresh + retry on 401.
  if (res.status === 401 && !anonymous) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      headers.Authorization = `Bearer ${newAccess}`;
      res = await fetch(url, { method, headers, body: payload, signal });
    }
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(extractMessage(data, `HTTP ${res.status}`), res.status, data);
  }
  return data as T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/v1/auth/login/", {
      method: "POST",
      body: { email, password },
      anonymous: true,
      noTenant: true,
    }),
  register: (payload: {
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }) =>
    request<{ user: { id: UUID; email: string }; tokens: JWTPair }>(
      "/api/v1/auth/register/",
      { method: "POST", body: payload, anonymous: true, noTenant: true },
    ),
  me: () => request<MeResponse>("/api/v1/auth/me/", { noTenant: true }),
  logout: (refresh: string) =>
    request<void>("/api/v1/auth/logout/", {
      method: "POST",
      body: { refresh },
      noTenant: true,
    }),
  changePassword: (old_password: string, new_password: string) =>
    request<{ detail: string }>("/api/v1/auth/password/change/", {
      method: "POST",
      body: { old_password, new_password },
      noTenant: true,
    }),
};

// ─── Entrepreneurs (tenants) ───────────────────────────────────────────────

export const entrepreneurs = {
  list: () =>
    request<Paginated<Entrepreneur> | Entrepreneur[]>("/api/v1/entrepreneurs/", {
      noTenant: true,
    }),
  retrieve: (id: UUID) =>
    request<Entrepreneur>(`/api/v1/entrepreneurs/${id}/`, { noTenant: true }),
  create: (payload: Partial<Entrepreneur> & { company_name: string }) =>
    request<Entrepreneur>("/api/v1/entrepreneurs/", {
      method: "POST",
      body: payload,
      noTenant: true,
    }),
  update: (id: UUID, payload: Partial<Entrepreneur>) =>
    request<Entrepreneur>(`/api/v1/entrepreneurs/${id}/`, {
      method: "PATCH",
      body: payload,
      noTenant: true,
    }),
};

// ─── Clients ───────────────────────────────────────────────────────────────

export const clients = {
  list: (params?: { search?: string; city?: string; country?: string; page?: number }) =>
    request<Paginated<Client>>("/api/v1/clients/", { query: params }),
  retrieve: (id: UUID) => request<Client>(`/api/v1/clients/${id}/`),
  create: (payload: ClientCreatePayload) =>
    request<Client>("/api/v1/clients/", { method: "POST", body: payload }),
  update: (id: UUID, payload: Partial<ClientCreatePayload>) =>
    request<Client>(`/api/v1/clients/${id}/`, { method: "PATCH", body: payload }),
  remove: (id: UUID) =>
    request<void>(`/api/v1/clients/${id}/`, { method: "DELETE" }),
};

// ─── Invoices ──────────────────────────────────────────────────────────────

export const invoices = {
  list: (params?: { search?: string; status?: string; client?: UUID; page?: number; ordering?: string }) =>
    request<Paginated<Invoice>>("/api/v1/invoices/", { query: params }),
  retrieve: (id: UUID) => request<Invoice>(`/api/v1/invoices/${id}/`),
  create: (payload: InvoiceCreatePayload) =>
    request<Invoice>("/api/v1/invoices/", { method: "POST", body: payload }),
  update: (id: UUID, payload: Partial<InvoiceCreatePayload>) =>
    request<Invoice>(`/api/v1/invoices/${id}/`, { method: "PATCH", body: payload }),
  validate: (id: UUID) =>
    request<Invoice>(`/api/v1/invoices/${id}/validate/`, { method: "POST" }),
  send: (id: UUID) =>
    request<Invoice>(`/api/v1/invoices/${id}/send/`, { method: "POST" }),
  pdfUrl: (id: UUID) => `${API_URL}/api/v1/invoices/${id}/pdf/`,
};

// ─── Quotes (Devis) ────────────────────────────────────────────────────────

export const quotes = {
  list: (params?: { search?: string; status?: string; client?: UUID; page?: number }) =>
    request<Paginated<Quote>>("/api/v1/quotes/", { query: params }),
  retrieve: (id: UUID) => request<Quote>(`/api/v1/quotes/${id}/`),
  send: (id: UUID) =>
    request<Quote>(`/api/v1/quotes/${id}/send/`, { method: "POST" }),
  accept: (id: UUID) =>
    request<Quote>(`/api/v1/quotes/${id}/accept/`, { method: "POST" }),
  refuse: (id: UUID) =>
    request<Quote>(`/api/v1/quotes/${id}/refuse/`, { method: "POST" }),
  convertToInvoice: (id: UUID) =>
    request<Invoice>(`/api/v1/quotes/${id}/convert/`, { method: "POST" }),
};

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const dashboard = {
  summary: () => request<DashboardSummary>("/api/v1/dashboard/summary/"),
  revenue: (months = 12) => request<unknown[]>("/api/v1/dashboard/revenue/", { query: { months } }),
  expenses: (months = 12) => request<unknown[]>("/api/v1/dashboard/expenses/", { query: { months } }),
  cashflow: () => request<{ revenue: unknown[]; expenses: unknown[] }>("/api/v1/dashboard/cashflow/"),
  overdueInvoices: () => request<Invoice[]>("/api/v1/dashboard/overdue-invoices/"),
};

// ─── Documents ─────────────────────────────────────────────────────────────

export const documents = {
  list: (params?: {
    search?: string;
    status?: string;
    category?: string;
    client?: UUID;
    document_request?: UUID;
    period_year?: number;
    period_month?: number;
    page?: number;
  }) => request<Paginated<DocumentItem>>("/api/v1/documents/", { query: params }),
  retrieve: (id: UUID) => request<DocumentItem>(`/api/v1/documents/${id}/`),
  upload: (params: {
    file: File;
    client: UUID;
    category?: string;
    period_month?: number;
    period_year?: number;
    document_request?: UUID;
    visible_to_client?: boolean;
    internal_comment?: string;
  }) => {
    const fd = new FormData();
    fd.append("file", params.file);
    fd.append("file_name", params.file.name);
    fd.append("client", params.client);
    if (params.category) fd.append("category", params.category);
    if (params.period_month != null) fd.append("period_month", String(params.period_month));
    if (params.period_year != null) fd.append("period_year", String(params.period_year));
    if (params.document_request) fd.append("document_request", params.document_request);
    if (params.visible_to_client !== undefined)
      fd.append("visible_to_client", String(params.visible_to_client));
    if (params.internal_comment) fd.append("internal_comment", params.internal_comment);
    return request<DocumentItem>("/api/v1/documents/", { method: "POST", body: fd });
  },
  update: (
    id: UUID,
    payload: Partial<Pick<DocumentItem, "category" | "period_month" | "period_year" | "internal_comment" | "client_comment" | "visible_to_client">>,
  ) => request<DocumentItem>(`/api/v1/documents/${id}/`, { method: "PATCH", body: payload }),
  remove: (id: UUID) => request<void>(`/api/v1/documents/${id}/`, { method: "DELETE" }),
  review: (
    id: UUID,
    decision: "validate" | "reject" | "incomplete",
    internal_comment?: string,
  ) =>
    request<DocumentItem>(`/api/v1/documents/${id}/review/`, {
      method: "POST",
      body: { decision, internal_comment: internal_comment ?? "" },
    }),
};

// ─── Document Requests ────────────────────────────────────────────────────

export const documentRequests = {
  list: (params?: { search?: string; status?: string; priority?: string; client?: UUID; page?: number }) =>
    request<Paginated<DocumentRequest>>("/api/v1/document-requests/", { query: params }),
  retrieve: (id: UUID) => request<DocumentRequest>(`/api/v1/document-requests/${id}/`),
  create: (payload: DocumentRequestCreatePayload) =>
    request<DocumentRequest>("/api/v1/document-requests/", { method: "POST", body: payload }),
  update: (id: UUID, payload: Partial<DocumentRequestCreatePayload>) =>
    request<DocumentRequest>(`/api/v1/document-requests/${id}/`, { method: "PATCH", body: payload }),
  remove: (id: UUID) => request<void>(`/api/v1/document-requests/${id}/`, { method: "DELETE" }),
  remind: (id: UUID) =>
    request<DocumentRequest>(`/api/v1/document-requests/${id}/remind/`, { method: "POST" }),
};

// ─── Messages ──────────────────────────────────────────────────────────────

export const messages = {
  list: (params?: { client?: UUID; is_internal?: boolean; search?: string; page?: number }) =>
    request<Paginated<Message>>("/api/v1/messages/", { query: params }),
  retrieve: (id: UUID) => request<Message>(`/api/v1/messages/${id}/`),
  create: (payload: MessageCreatePayload) =>
    request<Message>("/api/v1/messages/", { method: "POST", body: payload }),
  remove: (id: UUID) => request<void>(`/api/v1/messages/${id}/`, { method: "DELETE" }),
  markRead: (id: UUID) =>
    request<Message>(`/api/v1/messages/${id}/read/`, { method: "POST" }),
  markAllRead: (client?: UUID) =>
    request<{ marked: number }>("/api/v1/messages/mark-all-read/", {
      method: "POST",
      body: client ? { client } : undefined,
    }),
};

// ─── Tasks ────────────────────────────────────────────────────────────────

export const tasks = {
  list: (params?: {
    search?: string;
    status?: string;
    priority?: string;
    client?: UUID;
    assigned_to?: UUID;
    page?: number;
  }) => request<Paginated<Task>>("/api/v1/tasks/", { query: params }),
  retrieve: (id: UUID) => request<Task>(`/api/v1/tasks/${id}/`),
  create: (payload: TaskCreatePayload) =>
    request<Task>("/api/v1/tasks/", { method: "POST", body: payload }),
  update: (id: UUID, payload: Partial<TaskCreatePayload>) =>
    request<Task>(`/api/v1/tasks/${id}/`, { method: "PATCH", body: payload }),
  remove: (id: UUID) => request<void>(`/api/v1/tasks/${id}/`, { method: "DELETE" }),
  complete: (id: UUID) =>
    request<Task>(`/api/v1/tasks/${id}/complete/`, { method: "POST" }),
};

// ─── Deadlines ────────────────────────────────────────────────────────────

export const deadlines = {
  list: (params?: { search?: string; status?: string; type?: string; client?: UUID; page?: number }) =>
    request<Paginated<Deadline>>("/api/v1/deadlines/", { query: params }),
  retrieve: (id: UUID) => request<Deadline>(`/api/v1/deadlines/${id}/`),
  create: (payload: DeadlineCreatePayload) =>
    request<Deadline>("/api/v1/deadlines/", { method: "POST", body: payload }),
  update: (id: UUID, payload: Partial<DeadlineCreatePayload>) =>
    request<Deadline>(`/api/v1/deadlines/${id}/`, { method: "PATCH", body: payload }),
  remove: (id: UUID) => request<void>(`/api/v1/deadlines/${id}/`, { method: "DELETE" }),
  complete: (id: UUID) =>
    request<Deadline>(`/api/v1/deadlines/${id}/complete/`, { method: "POST" }),
};

// ─── Notifications ────────────────────────────────────────────────────────

export const notifications = {
  list: () =>
    request<Paginated<AppNotification> | AppNotification[]>("/api/v1/notifications/"),
  markRead: (id: UUID) =>
    request<AppNotification>(`/api/v1/notifications/${id}/read/`, { method: "PATCH" }),
  markAllRead: () =>
    request<{ marked_read: number }>("/api/v1/notifications/mark-all-read/", {
      method: "POST",
    }),
};

// ─── default export ────────────────────────────────────────────────────────

export const api = {
  auth,
  entrepreneurs,
  clients,
  invoices,
  quotes,
  dashboard,
  documents,
  documentRequests,
  messages,
  tasks,
  deadlines,
  notifications,
};
export { API_URL };
