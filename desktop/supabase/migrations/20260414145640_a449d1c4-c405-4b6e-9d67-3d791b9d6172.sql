
-- 1. ENUM & HELPERS
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT, last_name TEXT, username TEXT UNIQUE, phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. CLIENTS (admin-only policy first, client policy added after client_accounts)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL, contact_first_name TEXT, contact_last_name TEXT,
  email TEXT, phone TEXT, address TEXT, siren TEXT, siret TEXT, vat_number TEXT,
  legal_form TEXT, business_activity TEXT, tax_regime TEXT, vat_regime TEXT, vat_frequency TEXT,
  fiscal_year_end DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access clients" ON public.clients FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. CLIENT_ACCOUNTS
CREATE TABLE public.client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_status TEXT NOT NULL DEFAULT 'active' CHECK (access_status IN ('active', 'suspended', 'disabled')),
  can_access_mobile BOOLEAN DEFAULT true, can_access_web BOOLEAN DEFAULT false,
  last_mobile_login_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id), UNIQUE(user_id)
);
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access client_accounts" ON public.client_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can read own account" ON public.client_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_client_accounts_updated_at BEFORE UPDATE ON public.client_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now add client policy referencing client_accounts
CREATE POLICY "Clients can read own client record" ON public.clients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = id AND ca.user_id = auth.uid()));

-- 6. DOCUMENTS
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL, original_file_name TEXT, storage_path TEXT NOT NULL,
  mime_type TEXT, size_bytes BIGINT, category TEXT, period_month INT, period_year INT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'under_review', 'validated', 'rejected', 'incomplete', 'archived')),
  visible_to_client BOOLEAN DEFAULT true, internal_comment TEXT, client_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access documents" ON public.documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can read own visible documents" ON public.documents FOR SELECT TO authenticated
  USING (visible_to_client = true AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = documents.client_id AND ca.user_id = auth.uid()));
CREATE POLICY "Clients can insert own documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = documents.client_id AND ca.user_id = auth.uid()));
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. DOCUMENT_REQUESTS
CREATE TABLE public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL, description TEXT, requested_type TEXT, due_date DATE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'seen', 'partially_completed', 'completed', 'overdue', 'cancelled')),
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access document_requests" ON public.document_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can read own requests" ON public.document_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = document_requests.client_id AND ca.user_id = auth.uid()));
CREATE TRIGGER update_document_requests_updated_at BEFORE UPDATE ON public.document_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  body TEXT NOT NULL, is_internal BOOLEAN DEFAULT false,
  related_document_id UUID REFERENCES public.documents(id),
  related_request_id UUID REFERENCES public.document_requests(id),
  read_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access messages" ON public.messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can read own non-internal messages" ON public.messages FOR SELECT TO authenticated
  USING (is_internal = false AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = messages.client_id AND ca.user_id = auth.uid()));
CREATE POLICY "Clients can insert own messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (is_internal = false AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = messages.client_id AND ca.user_id = auth.uid()));

-- 9. INVOICES
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invoice', 'quote', 'credit_note')),
  number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  issue_date DATE NOT NULL, due_date DATE, currency TEXT DEFAULT 'EUR',
  subtotal_ht NUMERIC(12,2) DEFAULT 0, total_discount_ht NUMERIC(12,2) DEFAULT 0,
  total_vat NUMERIC(12,2) DEFAULT 0, total_ttc NUMERIC(12,2) DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0, amount_due NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  notes TEXT, terms TEXT, footer TEXT,
  source_quote_id UUID REFERENCES public.invoices(id),
  original_invoice_id UUID REFERENCES public.invoices(id),
  pdf_storage_path TEXT, visible_to_client BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ, sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can read own visible invoices" ON public.invoices FOR SELECT TO authenticated
  USING (visible_to_client = true AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = invoices.client_id AND ca.user_id = auth.uid()));
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. INVOICE_ITEMS
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  position INT NOT NULL, label TEXT NOT NULL, description TEXT,
  quantity NUMERIC(12,2) NOT NULL, unit TEXT, unit_price_ht NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0, vat_rate NUMERIC(5,2) DEFAULT 0,
  line_total_ht NUMERIC(12,2) NOT NULL, line_total_ttc NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access invoice_items" ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Clients can read own visible invoice_items" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i JOIN public.client_accounts ca ON ca.client_id = i.client_id WHERE i.id = invoice_items.invoice_id AND i.visible_to_client = true AND ca.user_id = auth.uid()));
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. INVOICE_PAYMENTS
CREATE TABLE public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL, payment_date DATE NOT NULL,
  payment_method TEXT, reference TEXT, notes TEXT,
  created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access invoice_payments" ON public.invoice_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_payments.invoice_id AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Clients can read own invoice_payments" ON public.invoice_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i JOIN public.client_accounts ca ON ca.client_id = i.client_id WHERE i.id = invoice_payments.invoice_id AND i.visible_to_client = true AND ca.user_id = auth.uid()));

-- 12. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, is_read BOOLEAN DEFAULT false,
  related_client_id UUID REFERENCES public.clients(id),
  related_document_id UUID REFERENCES public.documents(id),
  related_invoice_id UUID REFERENCES public.invoices(id),
  related_message_id UUID REFERENCES public.messages(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 13. SETTINGS
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT, logo_storage_path TEXT, address TEXT, email TEXT, phone TEXT,
  siret TEXT, vat_number TEXT, iban TEXT, bic TEXT,
  invoice_prefix TEXT DEFAULT 'FAC', quote_prefix TEXT DEFAULT 'DEV', credit_note_prefix TEXT DEFAULT 'AV',
  default_terms TEXT, default_footer TEXT,
  default_late_penalty_rate NUMERIC(5,2) DEFAULT 3.0, default_recovery_fee NUMERIC(12,2) DEFAULT 40.0,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. AUDIT_LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 15. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-pdfs', 'invoice-pdfs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('cabinet-assets', 'cabinet-assets', true);

CREATE POLICY "Admins full access client-documents" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can read own documents storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.user_id = auth.uid() AND (storage.foldername(name))[1] = ca.client_id::text));
CREATE POLICY "Clients can upload own documents storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.user_id = auth.uid() AND (storage.foldername(name))[1] = ca.client_id::text));
CREATE POLICY "Admins full access invoice-pdfs" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'invoice-pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can read own invoice-pdfs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoice-pdfs' AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.user_id = auth.uid() AND (storage.foldername(name))[1] = ca.client_id::text));
CREATE POLICY "Admins full access message-attachments" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'message-attachments' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can read own message-attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments' AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.user_id = auth.uid() AND (storage.foldername(name))[1] = ca.client_id::text));
CREATE POLICY "Clients can upload message-attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments' AND EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.user_id = auth.uid() AND (storage.foldername(name))[1] = ca.client_id::text));
CREATE POLICY "Public read cabinet-assets" ON storage.objects FOR SELECT USING (bucket_id = 'cabinet-assets');
CREATE POLICY "Admins can manage cabinet-assets" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'cabinet-assets' AND public.has_role(auth.uid(), 'admin'));

-- 16. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN INSERT INTO public.profiles (user_id) VALUES (NEW.id); RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
