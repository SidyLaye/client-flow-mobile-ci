// Data layer for the ClientDetail page — Django REST API version.
// Replaces the old Supabase client-data.ts.
import { api } from "@/lib/api";
import type { Client, DocumentItem, DocumentRequest, Message, Invoice } from "@/lib/api-types";

// Re-export Django types under the names the components expect.
export type ClientRow = Client;
export type DocumentRow = DocumentItem;
export type RequestRow = DocumentRequest;
export type MessageRow = Message;
export type InvoiceRow = Invoice;
export type ClientUpdate = Partial<Client>;

export async function fetchClient(id: string): Promise<ClientRow> {
  return api.clients.retrieve(id);
}

export async function fetchClientDocuments(id: string): Promise<DocumentRow[]> {
  const res = await api.documents.list({ client: id });
  return res.results;
}

export async function fetchClientRequests(id: string): Promise<RequestRow[]> {
  const res = await api.documentRequests.list({ client: id });
  return res.results;
}

export async function fetchClientMessages(id: string): Promise<MessageRow[]> {
  const res = await api.messages.list({ client: id });
  return res.results;
}

export async function fetchClientInvoices(id: string): Promise<InvoiceRow[]> {
  const res = await api.invoices.list({ client: id });
  return res.results;
}

export async function updateClient(id: string, patch: ClientUpdate): Promise<ClientRow> {
  return api.clients.update(id, patch);
}

export async function archiveClient(id: string): Promise<ClientRow> {
  return api.clients.update(id, { status: "archived" });
}

export async function unarchiveClient(id: string): Promise<ClientRow> {
  return api.clients.update(id, { status: "active" });
}

export async function deleteClient(id: string): Promise<void> {
  return api.clients.remove(id);
}

export async function createDocumentRequest(payload: {
  client_id: string;
  title: string;
  description?: string;
  priority?: string;
  due_date?: string | null;
}): Promise<RequestRow> {
  return api.documentRequests.create({
    client: payload.client_id,
    title: payload.title,
    description: payload.description ?? "",
    requested_type: "",
    due_date: payload.due_date ?? null,
    priority: (payload.priority ?? "normal") as RequestRow["priority"],
  });
}

export async function remindRequest(id: string): Promise<RequestRow> {
  return api.documentRequests.remind(id);
}

export async function sendMessage(payload: {
  client_id: string;
  body: string;
  is_internal?: boolean;
}): Promise<MessageRow> {
  return api.messages.create({
    client: payload.client_id,
    body: payload.body,
    is_internal: payload.is_internal ?? false,
  });
}

export async function uploadDocument(payload: {
  client_id: string;
  file: File;
  category?: string;
  period_month?: number;
  period_year?: number;
  visible_to_client?: boolean;
  internal_comment?: string;
}): Promise<DocumentRow> {
  return api.documents.upload({
    file: payload.file,
    client: payload.client_id,
    category: payload.category,
    period_month: payload.period_month,
    period_year: payload.period_year,
    visible_to_client: payload.visible_to_client,
    internal_comment: payload.internal_comment,
  });
}
