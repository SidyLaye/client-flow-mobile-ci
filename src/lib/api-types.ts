// Types mirrored from the Django backend (apps/*/serializers.py and models.py).
// Keep these in sync manually until we wire OpenAPI codegen.

export type UUID = string;
export type ISODate = string;        // YYYY-MM-DD
export type ISODatetime = string;    // ISO 8601 with time
export type DecimalString = string;  // DRF serializes Decimal as string

// ─── Auth / Users / Tenants ────────────────────────────────────────────────

export interface User {
  id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_joined: ISODatetime;
}

export type EntrepreneurRole =
  | "owner"
  | "admin"
  | "accountant"
  | "collaborator"
  | "read_only";

export interface UserRoleEntry {
  id: UUID;
  user: UUID;
  user_email: string;
  user_name: string;
  entrepreneur: UUID;
  role: EntrepreneurRole;
  is_active: boolean;
  created_at: ISODatetime;
}

export interface MeResponse {
  user: User;
  roles: UserRoleEntry[];
}

export interface JWTPair {
  access: string;
  refresh: string;
}

export interface LoginResponse extends JWTPair {}

export interface Entrepreneur {
  id: UUID;
  company_name: string;
  siren: string | null;
  siret: string | null;
  legal_form: string;
  vat_number: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  country: string;
  default_vat_rate: DecimalString;
  fiscal_year_start_month: number;
  invoice_prefix: string;
  quote_prefix: string;
  next_invoice_number: number;
  next_quote_number: number;
  is_active: boolean;
  created_at: ISODatetime;
  updated_at: ISODatetime;
}

// ─── Clients ───────────────────────────────────────────────────────────────

export type ClientStatus = "active" | "in_creation" | "suspended" | "closed" | "archived";
export type TaxRegime = "reel_normal" | "reel_simplifie" | "micro" | "franchise";
export type VATRegime = "reel_normal" | "reel_simplifie" | "franchise";
export type VATFrequency = "monthly" | "quarterly" | "yearly";

export interface Client {
  id: UUID;
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  siren: string;
  siret: string;
  vat_number: string;
  legal_form: string;
  business_activity: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  country: string;
  status: ClientStatus;
  tax_regime: TaxRegime | "";
  vat_regime: VATRegime | "";
  vat_frequency: VATFrequency | "";
  fiscal_year_end: ISODate | null;
  assigned_user: UUID | null;
  assigned_user_email: string | null;
  notes: string;
  created_at: ISODatetime;
  updated_at: ISODatetime;
}

export type ClientCreatePayload = Omit<
  Client,
  "id" | "created_at" | "updated_at" | "assigned_user_email"
>;

// ─── Invoices ──────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | "draft"
  | "validated"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export interface InvoiceLine {
  id: UUID;
  position: number;
  description: string;
  quantity: DecimalString;
  unit: string;
  unit_price_ht: DecimalString;
  vat_rate: DecimalString;
  total_ht: DecimalString;
  total_vat: DecimalString;
  total_ttc: DecimalString;
  accounting_code?: string;
}

export interface Invoice {
  id: UUID;
  invoice_number: string;
  client: UUID;
  client_name: string;
  status: InvoiceStatus;
  issue_date: ISODate;
  due_date: ISODate;
  total_ht: DecimalString;
  total_vat: DecimalString;
  total_ttc: DecimalString;
  amount_paid: DecimalString;
  amount_due: DecimalString;
  notes: string;
  terms: string;
  payment_reference: string;
  stripe_payment_link: string | null;
  is_locked: boolean;
  validated_at: ISODatetime | null;
  pdf_file: string | null;
  created_by: UUID | null;
  created_at: ISODatetime;
  updated_at: ISODatetime;
  lines: InvoiceLine[];
}

export interface InvoiceCreatePayload {
  client: UUID;
  issue_date: ISODate;
  due_date: ISODate;
  notes?: string;
  terms?: string;
  lines: Array<Pick<InvoiceLine,
    "position" | "description" | "quantity" | "unit" | "unit_price_ht" | "vat_rate"
  >>;
}

// ─── Quotes (Devis) ────────────────────────────────────────────────────────

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "refused"
  | "expired"
  | "invoiced";

export interface QuoteLine {
  id: UUID;
  position: number;
  description: string;
  quantity: DecimalString;
  unit: string;
  unit_price_ht: DecimalString;
  vat_rate: DecimalString;
  total_ht: DecimalString;
  total_vat: DecimalString;
  total_ttc: DecimalString;
}

export interface Quote {
  id: UUID;
  quote_number: string;
  client: UUID;
  client_name: string;
  status: QuoteStatus;
  issue_date: ISODate;
  validity_date: ISODate;
  total_ht: DecimalString;
  total_vat: DecimalString;
  total_ttc: DecimalString;
  notes: string;
  terms: string;
  converted_invoice: UUID | null;
  created_by: UUID | null;
  created_at: ISODatetime;
  updated_at: ISODatetime;
  lines: QuoteLine[];
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export interface DashboardSummary {
  revenue: { year_to_date: DecimalString; month_to_date: DecimalString };
  expenses: { year_to_date: DecimalString; month_to_date: DecimalString };
  profit_ytd: DecimalString;
  outstanding_invoices: { total_amount: DecimalString; count: number };
  overdue_invoices: { total_amount: DecimalString; count: number };
  bank_balance: DecimalString;
  pending_quotes: { total_amount: DecimalString; count: number };
}

// ─── Documents ─────────────────────────────────────────────────────────────

export type DocumentStatus =
  | "received"
  | "under_review"
  | "validated"
  | "rejected"
  | "incomplete"
  | "archived";

export type DocumentCategory =
  | "bank_statement"
  | "purchase_invoice"
  | "sales_invoice"
  | "contract"
  | "id_document"
  | "rib"
  | "tax_document"
  | "other";

export interface DocumentItem {
  id: UUID;
  client: UUID;
  client_name: string;
  document_request: UUID | null;
  file_url: string | null;
  file_name: string;
  original_file_name: string;
  mime_type: string;
  size_bytes: number;
  category: DocumentCategory;
  period_month: number | null;
  period_year: number | null;
  status: DocumentStatus;
  visible_to_client: boolean;
  internal_comment: string;
  client_comment: string;
  uploaded_by: UUID | null;
  reviewed_by: UUID | null;
  reviewed_at: ISODatetime | null;
  created_at: ISODatetime;
  updated_at: ISODatetime;
}

// ─── Document Requests ────────────────────────────────────────────────────

export type DocumentRequestStatus =
  | "draft"
  | "sent"
  | "seen"
  | "partially_completed"
  | "completed"
  | "overdue"
  | "cancelled";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface DocumentRequest {
  id: UUID;
  client: UUID;
  client_name: string;
  title: string;
  description: string;
  requested_type: string;
  due_date: ISODate | null;
  priority: Priority;
  status: DocumentRequestStatus;
  last_reminder_at: ISODatetime | null;
  reminder_count: number;
  created_by: UUID | null;
  created_at: ISODatetime;
  updated_at: ISODatetime;
}

export type DocumentRequestCreatePayload = Pick<
  DocumentRequest,
  "client" | "title" | "description" | "requested_type" | "due_date" | "priority"
> &
  Partial<Pick<DocumentRequest, "status">>;

// ─── Messages ──────────────────────────────────────────────────────────────

export interface Message {
  id: UUID;
  client: UUID;
  client_name: string;
  sender: UUID | null;
  sender_email: string;
  sender_name: string;
  body: string;
  is_internal: boolean;
  related_document: UUID | null;
  related_request: UUID | null;
  read_at: ISODatetime | null;
  created_at: ISODatetime;
}

export interface MessageCreatePayload {
  client: UUID;
  body: string;
  is_internal?: boolean;
  related_document?: UUID | null;
  related_request?: UUID | null;
}

// ─── Tasks ────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";

export interface Task {
  id: UUID;
  title: string;
  description: string;
  category: string;
  client: UUID | null;
  client_name: string;
  assigned_to: UUID | null;
  assigned_to_email: string | null;
  created_by: UUID | null;
  priority: Priority;
  status: TaskStatus;
  due_date: ISODate | null;
  completed_at: ISODatetime | null;
  created_at: ISODatetime;
  updated_at: ISODatetime;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
  category?: string;
  client?: UUID | null;
  assigned_to?: UUID | null;
  priority?: Priority;
  status?: TaskStatus;
  due_date?: ISODate | null;
}

// ─── Deadlines ────────────────────────────────────────────────────────────

export type DeadlineType =
  | "vat_declaration"
  | "vat_payment"
  | "corporate_tax"
  | "income_tax"
  | "social_declaration"
  | "fiscal_balance"
  | "urssaf"
  | "other";

export type DeadlineStatus =
  | "to_prepare"
  | "awaiting_documents"
  | "ready"
  | "sent"
  | "validated"
  | "overdue";

export interface Deadline {
  id: UUID;
  title: string;
  type: DeadlineType;
  client: UUID;
  client_name: string;
  assigned_to: UUID | null;
  assigned_to_email: string | null;
  due_date: ISODate;
  status: DeadlineStatus;
  notes: string;
  vat_declaration: UUID | null;
  completed_at: ISODatetime | null;
  created_at: ISODatetime;
  updated_at: ISODatetime;
}

export interface DeadlineCreatePayload {
  title: string;
  type: DeadlineType;
  client: UUID;
  due_date: ISODate;
  status?: DeadlineStatus;
  assigned_to?: UUID | null;
  notes?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────

export interface AppNotification {
  id: UUID;
  user: UUID;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  created_at: ISODatetime;
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
