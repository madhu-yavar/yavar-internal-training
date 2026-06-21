
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS tone text DEFAULT 'conversational',
  ADD COLUMN IF NOT EXISTS tech_depth int DEFAULT 3,
  ADD COLUMN IF NOT EXISTS audience text DEFAULT 'business professionals',
  ADD COLUMN IF NOT EXISTS prompt_override text;

ALTER TABLE public.slides
  ADD COLUMN IF NOT EXISTS generation_hint text,
  ADD COLUMN IF NOT EXISTS illustration_url text,
  ADD COLUMN IF NOT EXISTS icon_keywords text[];

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  template text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_templates TO authenticated;
GRANT ALL ON public.prompt_templates TO service_role;

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage templates" ON public.prompt_templates;
CREATE POLICY "admins manage templates" ON public.prompt_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.prompt_templates (scope, template)
VALUES ('global',
$tpl$You are scripting voice-over narration for an interactive training course titled "{{courseTitle}}".
Tone: {{tone}}. Audience: {{audience}}. Technical depth (1=simple, 5=expert): {{depth}}.

Write a SHORT, conversational narration for EACH slide below. 40-70 words per slide. Speak directly to the learner ("you"). Connect ideas slide-to-slide. Paraphrase, add context, give a real-world hook. Never read bullets verbatim. No markdown, no slide numbers, no preamble.

Also extract 1-3 concrete keywords per slide (single words, lowercase nouns) that capture the visual concept.

Return STRICT JSON: { "narrations": ["...slide 1...", ...], "keywords": [["k1","k2"], ...] } with exactly {{slideCount}} entries in each array.

DECK:
{{deck}}$tpl$
)
ON CONFLICT (scope) DO NOTHING;
