-- ============================================================================
-- Python Sandbox Feature - Exercise & Attempt Tables
-- ============================================================================

-- Sandbox Exercises: Python coding challenges for learners
CREATE TABLE IF NOT EXISTS public.sandbox_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  starter_code TEXT DEFAULT '# Write your code here\n',
  solution_code TEXT,
  test_cases JSONB DEFAULT '[]',
  hints JSONB DEFAULT '[]',
  difficulty TEXT DEFAULT 'medium',
  topic TEXT,
  estimated_minutes INT DEFAULT 15,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sandbox_exercises_published ON public.sandbox_exercises(is_published, difficulty) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_sandbox_exercises_topic ON public.sandbox_exercises(topic) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_sandbox_exercises_created_by ON public.sandbox_exercises(created_by);

-- Enable Row Level Security
ALTER TABLE public.sandbox_exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Published exercises are viewable by all authenticated users
CREATE POLICY "published_exercises_viewable_by_all"
  ON public.sandbox_exercises FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Admins can manage all exercises
CREATE POLICY "admins_manage_all_exercises"
  ON public.sandbox_exercises FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Users can view their own created exercises
CREATE POLICY "users_view_own_exercises"
  ON public.sandbox_exercises FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================================================
-- Sandbox Attempts: Track learner submissions and results
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sandbox_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  exercise_id UUID REFERENCES public.sandbox_exercises(id) NOT NULL,
  code_submitted TEXT NOT NULL,
  test_results JSONB,
  ai_review JSONB,
  passed BOOLEAN DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for analytics and history
CREATE INDEX IF NOT EXISTS idx_sandbox_attempts_user_exercise ON public.sandbox_attempts(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_attempts_exercise ON public.sandbox_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_attempts_passed ON public.sandbox_attempts(passed) WHERE passed = true;
CREATE INDEX IF NOT EXISTS idx_sandbox_attempts_user ON public.sandbox_attempts(user_id);

-- Enable Row Level Security
ALTER TABLE public.sandbox_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own attempts
CREATE POLICY "users_view_own_attempts"
  ON public.sandbox_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own attempts
CREATE POLICY "users_create_own_attempts"
  ON public.sandbox_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all attempts
CREATE POLICY "admins_view_all_attempts"
  ON public.sandbox_attempts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Helper function to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sandbox_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_sandbox_exercises_updated_at_trigger ON public.sandbox_exercises;
CREATE TRIGGER update_sandbox_exercises_updated_at_trigger
  BEFORE UPDATE ON public.sandbox_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_sandbox_exercises_updated_at();
