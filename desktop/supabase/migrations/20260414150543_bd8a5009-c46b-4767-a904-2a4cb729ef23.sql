
DROP POLICY "Clients can read own client record" ON public.clients;
CREATE POLICY "Clients can read own client record" ON public.clients
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = clients.id AND ca.user_id = auth.uid()));
