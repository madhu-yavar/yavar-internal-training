
CREATE POLICY "admins write course-assets" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-assets' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'course-assets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins write course-uploads" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-uploads' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'course-uploads' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth read course-uploads" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-uploads' AND public.has_role(auth.uid(),'admin'));
