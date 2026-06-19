
DROP POLICY IF EXISTS "auth read course-uploads" ON storage.objects;
CREATE POLICY "auth read course-uploads" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-uploads');
