
CREATE TABLE public.generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  course_id UUID,
  kind TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  slide_count INT,
  duration_ms INT
);
GRANT SELECT ON public.generation_logs TO authenticated;
GRANT ALL ON public.generation_logs TO service_role;
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view generation logs"
  ON public.generation_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX generation_logs_created_idx ON public.generation_logs (created_at DESC);
