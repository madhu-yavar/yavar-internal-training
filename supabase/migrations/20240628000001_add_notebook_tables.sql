-- ============================================================================
-- JupyterLite Notebook Feature - Notebook Exercises & Attempts
-- ============================================================================

-- Notebook Exercises: Jupyter notebook-based learning exercises
CREATE TABLE IF NOT EXISTS public.notebook_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  notebook_content JSONB NOT NULL,
  solution_notebook JSONB,
  difficulty TEXT DEFAULT 'medium',
  topic TEXT,
  estimated_minutes INT DEFAULT 30,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notebook_exercises_published ON public.notebook_exercises(is_published, difficulty) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_notebook_exercises_topic ON public.notebook_exercises(topic) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_notebook_exercises_created_by ON public.notebook_exercises(created_by);

-- Enable Row Level Security
ALTER TABLE public.notebook_exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Published notebooks are viewable by all authenticated users
CREATE POLICY "published_notebooks_viewable_by_all"
  ON public.notebook_exercises FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Admins can manage all notebooks
CREATE POLICY "admins_manage_all_notebooks"
  ON public.notebook_exercises FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Users can view their own created notebooks
CREATE POLICY "users_view_own_notebooks"
  ON public.notebook_exercises FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================================================
-- Notebook Attempts: Track learner notebook submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notebook_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  exercise_id UUID REFERENCES public.notebook_exercises(id) NOT NULL,
  notebook_state JSONB NOT NULL,
  passed BOOLEAN DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notebook_attempts_user_exercise ON public.notebook_attempts(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_notebook_attempts_exercise ON public.notebook_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_notebook_attempts_passed ON public.notebook_attempts(passed) WHERE passed = true;
CREATE INDEX IF NOT EXISTS idx_notebook_attempts_user ON public.notebook_attempts(user_id);

-- Enable Row Level Security
ALTER TABLE public.notebook_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notebook attempts
CREATE POLICY "users_view_own_notebook_attempts"
  ON public.notebook_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own notebook attempts
CREATE POLICY "users_create_notebook_attempts"
  ON public.notebook_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all notebook attempts
CREATE POLICY "admins_view_all_notebook_attempts"
  ON public.notebook_attempts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Helper function to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_notebook_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_notebook_exercises_updated_at_trigger ON public.notebook_exercises;
CREATE TRIGGER update_notebook_exercises_updated_at_trigger
  BEFORE UPDATE ON public.notebook_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_exercises_updated_at();
