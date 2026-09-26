
-- Add missing columns to documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_request_id uuid REFERENCES public.document_requests(id),
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'client-documents',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Storage policies for client-documents bucket
-- Admins can read files for their own clients
CREATE POLICY "Admins can read client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND public.has_role(auth.uid(), 'admin')
  AND public.admin_owns_client((storage.foldername(name))[1]::uuid)
);

-- Admins can upload files for their own clients
CREATE POLICY "Admins can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND public.has_role(auth.uid(), 'admin')
  AND public.admin_owns_client((storage.foldername(name))[1]::uuid)
);

-- Admins can delete files for their own clients
CREATE POLICY "Admins can delete client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND public.has_role(auth.uid(), 'admin')
  AND public.admin_owns_client((storage.foldername(name))[1]::uuid)
);

-- Clients can read their own files
CREATE POLICY "Clients can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.user_id = auth.uid()
    AND ca.client_id = (storage.foldername(name))[1]::uuid
  )
);

-- Clients can upload files to their own folder
CREATE POLICY "Clients can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.user_id = auth.uid()
    AND ca.client_id = (storage.foldername(name))[1]::uuid
  )
);
