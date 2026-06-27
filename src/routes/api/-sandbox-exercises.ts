import { createServerFn } from '@tanStack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/external-auth-middleware';
import type { TestCase } from '~/lib/sandbox.types';

/* ---- Get all published exercises (for learners) ---- */
export const getPublishedExercises = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = await import('@/integrations/supabase/external.server');

    const { data, error } = await supabase
      .from('sandbox_exercises')
      .select('id, title, description, difficulty, topic, estimated_minutes')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { exercises: data ?? [] };
  });

/* ---- Get single exercise by ID ---- */
export const getExercise = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ request }) => {
    const url = new URL(request.url);
    const exerciseId = url.searchParams.get('id');
    if (!exerciseId) {
      throw new Error('Exercise ID is required');
    }

    const { supabase } = await import('@/integrations/supabase/external.server');

    const { data, error } = await supabase
      .from('sandbox_exercises')
      .select('*')
      .eq('id', exerciseId)
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error('Exercise not found');
    }

    // Check if user has access (published or owned by user or admin)
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });

    if (!data.is_published && !isAdmin && data.created_by !== context.userId) {
      throw new Error('You do not have access to this exercise');
    }

    return { exercise: data as typeof data & { test_cases: TestCase[]; hints: string[] } };
  });

/* ---- Get user's attempt history for an exercise ---- */
export const getExerciseAttempts = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ request }) => {
    const url = new URL(request.url);
    const exerciseId = url.searchParams.get('id');
    if (!exerciseId) {
      throw new Error('Exercise ID is required');
    }

    const { supabase } = await import('@/integrations/supabase/external.server');

    const { data, error } = await supabase
      .from('sandbox_attempts')
      .select('*')
      .eq('user_id', context.userId)
      .eq('exercise_id', exerciseId)
      .order('attempted_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return { attempts: data ?? [] };
  });

/* ---- Save attempt (submit code and results) ---- */
const SaveAttemptInput = z.object({
  exerciseId: z.string(),
  code: z.string(),
  testResults: z.object({
    passed: z.boolean(),
    results: z.array(z.any()),
    execution_time_ms: z.number(),
    error: z.string().optional(),
  }),
  aiReview: z.object({
    summary: z.string(),
    strengths: z.array(z.string()),
    issues: z.array(z.string()),
    suggestions: z.array(z.string()),
    best_practices: z.array(z.string()),
  }).optional(),
});

export const saveAttempt = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveAttemptInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = await import('@/integrations/supabase/external.server');

    const { error } = await supabase.from('sandbox_attempts').insert({
      user_id: context.userId,
      exercise_id: data.exerciseId,
      code_submitted: data.code,
      test_results: data.testResults,
      ai_review: data.aiReview,
      passed: data.testResults.passed,
    });

    if (error) throw error;
    return { ok: true };
  });

/* ---- Admin: Create exercise ---- */
const CreateExerciseInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  instructions: z.string().max(2000).nullable(),
  starter_code: z.string().default('# Write your code here\n'),
  solution_code: z.string().nullable(),
  test_cases: z.array(z.object({
    description: z.string().optional(),
    input: z.string(),
    expected_output: z.string(),
  })).default([]),
  hints: z.array(z.string()).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  topic: z.string().nullable(),
  estimated_minutes: z.number().int().min(1).max(120).default(15),
  is_published: z.boolean().default(false),
});

export const createExercise = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateExerciseInput.parse(d))
  .handler(async ({ data, context }) => {
    // Check admin role
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (!isAdmin) throw new Error('Forbidden: Admin access required');

    const { supabaseAdmin } = await import('@/integrations/supabase/external.server');

    const { data: exercise, error } = await supabaseAdmin
      .from('sandbox_exercises')
      .insert({
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        starter_code: data.starter_code,
        solution_code: data.solution_code,
        test_cases: data.test_cases,
        hints: data.hints,
        difficulty: data.difficulty,
        topic: data.topic,
        estimated_minutes: data.estimated_minutes,
        is_published: data.is_published,
        created_by: context.userId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { exerciseId: exercise?.id };
  });

/* ---- Admin: Update exercise ---- */
const UpdateExerciseInput = CreateExerciseInput.partial().extend({
  id: z.string(),
});

export const updateExercise = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateExerciseInput.parse(d))
  .handler(async ({ data, context }) => {
    // Check admin role
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (!isAdmin) throw new Error('Forbidden: Admin access required');

    const { supabaseAdmin } = await import('@/integrations/supabase/external.server');
    const { id, ...updateData } = data;

    const { error } = await supabaseAdmin
      .from('sandbox_exercises')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return { ok: true };
  });

/* ---- Admin: Delete exercise ---- */
const DeleteExerciseInput = z.object({
  id: z.string(),
});

export const deleteExercise = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteExerciseInput.parse(d))
  .handler(async ({ data, context }) => {
    // Check admin role
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (!isAdmin) throw new Error('Forbidden: Admin access required');

    const { supabaseAdmin } = await import('@/integrations/supabase/external.server');

    const { error } = await supabaseAdmin
      .from('sandbox_exercises')
      .delete()
      .eq('id', data.id);

    if (error) throw error;
    return { ok: true };
  });

/* ---- Admin: Get all exercises (including unpublished) ---- */
export const getAllExercises = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check admin role
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (!isAdmin) throw new Error('Forbidden: Admin access required');

    const { supabaseAdmin } = await import('@/integrations/supabase/external.server');

    const { data, error } = await supabaseAdmin
      .from('sandbox_exercises')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { exercises: data ?? [] };
  });
