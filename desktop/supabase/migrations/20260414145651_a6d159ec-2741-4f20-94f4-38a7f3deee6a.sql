
DROP POLICY "Public read cabinet-assets" ON storage.objects;
CREATE POLICY "Public read cabinet-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'cabinet-assets' AND (storage.foldername(name))[1] = 'settings');
