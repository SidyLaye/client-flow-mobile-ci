
-- 1. Add assigned_admin_id to clients
ALTER TABLE public.clients ADD COLUMN assigned_admin_id uuid;

-- 2. Backfill existing clients: assign to created_by if available
UPDATE public.clients SET assigned_admin_id = created_by WHERE created_by IS NOT NULL;

-- ============================================================
-- CLIENTS: replace broad admin policy with scoped ones
-- ============================================================
DROP POLICY IF EXISTS "Admins full access clients" ON public.clients;

CREATE POLICY "Admins can select own clients"
  ON public.clients FOR SELECT TO authenticated
  USING (assigned_admin_id = auth.uid());

CREATE POLICY "Admins can insert own clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (assigned_admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update own clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (assigned_admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete own clients"
  ON public.clients FOR DELETE TO authenticated
  USING (assigned_admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Helper: check if admin owns a client
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_owns_client(_client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = _client_id AND assigned_admin_id = auth.uid()
  )
$$;

-- ============================================================
-- DOCUMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins full access documents" ON public.documents;

CREATE POLICY "Admins scoped access documents"
  ON public.documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND admin_owns_client(client_id));

-- ============================================================
-- DOCUMENT_REQUESTS
-- ============================================================
DROP POLICY IF EXISTS "Admins full access document_requests" ON public.document_requests;

CREATE POLICY "Admins scoped access document_requests"
  ON public.document_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND admin_owns_client(client_id));

-- ============================================================
-- MESSAGES
-- ============================================================
DROP POLICY IF EXISTS "Admins full access messages" ON public.messages;

CREATE POLICY "Admins scoped access messages"
  ON public.messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND admin_owns_client(client_id));

-- ============================================================
-- INVOICES
-- ============================================================
DROP POLICY IF EXISTS "Admins full access invoices" ON public.invoices;

CREATE POLICY "Admins scoped access invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND admin_owns_client(client_id));

-- ============================================================
-- INVOICE_ITEMS (linked via invoice_id → invoices.client_id)
-- ============================================================
DROP POLICY IF EXISTS "Admins full access invoice_items" ON public.invoice_items;

CREATE POLICY "Admins scoped access invoice_items"
  ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
      AND has_role(auth.uid(), 'admin'::app_role)
      AND admin_owns_client(i.client_id)
  ));

-- ============================================================
-- INVOICE_PAYMENTS (linked via invoice_id → invoices.client_id)
-- ============================================================
DROP POLICY IF EXISTS "Admins full access invoice_payments" ON public.invoice_payments;

CREATE POLICY "Admins scoped access invoice_payments"
  ON public.invoice_payments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_payments.invoice_id
      AND has_role(auth.uid(), 'admin'::app_role)
      AND admin_owns_client(i.client_id)
  ));

-- ============================================================
-- CLIENT_ACCOUNTS: scope admin access too
-- ============================================================
DROP POLICY IF EXISTS "Admins full access client_accounts" ON public.client_accounts;

CREATE POLICY "Admins scoped access client_accounts"
  ON public.client_accounts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND admin_owns_client(client_id));

-- ============================================================
-- AUDIT_LOGS: keep admin-only but no change needed (not client-scoped)
-- ============================================================
