-- ============================================================================
-- Fix Sandbox Duplicates & Add Unique Constraint
-- ============================================================================

-- Step 1: Delete duplicates, keeping only the first occurrence of each title
WITH ranked_exercises AS (
  SELECT
    id,
    title,
    ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at) as rn
  FROM public.sandbox_exercises
)
DELETE FROM public.sandbox_exercises
WHERE id IN (
  SELECT id FROM ranked_exercises WHERE rn > 1
);

-- Step 2: Add unique constraint on title to prevent future duplicates
ALTER TABLE public.sandbox_exercises
ADD CONSTRAINT sandbox_exercises_title_unique UNIQUE (title);

-- Step 3: Update seed migration to use explicit IDs for conflict detection
-- This ensures ON CONFLICT DO NOTHING works properly
