
-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  score int NOT NULL,
  total int NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own attempts" ON public.quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users read own attempts or admin" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX quiz_attempts_user_course_idx ON public.quiz_attempts(user_id, course_id, taken_at DESC);

-- Course requests / messages to admin
CREATE TABLE public.course_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('new_course','correction','question')),
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','responded','closed')),
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.course_requests TO authenticated;
GRANT ALL ON public.course_requests TO service_role;
ALTER TABLE public.course_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user inserts own request" ON public.course_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user reads own or admin reads all" ON public.course_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin updates requests" ON public.course_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER course_requests_touch BEFORE UPDATE ON public.course_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX course_requests_user_idx ON public.course_requests(user_id, created_at DESC);
CREATE INDEX course_requests_status_idx ON public.course_requests(status, created_at DESC);
