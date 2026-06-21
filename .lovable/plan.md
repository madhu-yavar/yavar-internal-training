# Plan: Admin-Controlled Narrative Generation

## 1. Admin Gemini Key + Model Routing

- Add an **Admin Settings** page (`/admin/settings`) with a single field: "Google Gemini API Key".
- Save via a `setGeminiKey` server fn (admin-only, `has_role` check) that writes the `GEMINI_API_KEY` secret. Display masked status: "Key configured ✓ (Gemini 3.1 Pro active)" or "Not set — using Lovable Gemini Flash fallback".
- New helper `getNarrationModel()` server-side:
  - If `process.env.GEMINI_API_KEY` present → call Google's native Gemini API (`gemini-3-pro-preview`) directly with that key.
  - Else → fall back to Lovable AI Gateway `google/gemini-3-flash-preview`.
- Every generation response returns `{ modelUsed }`. Admin UI shows a badge next to each Generate button reflecting current routing so the admin always knows which model produced the content.

## 2. Prompt Template System (Global + Per-Course)

New table `prompt_templates` (single global row, admin-editable):
```
id uuid pk, scope text default 'global',
template text, updated_at timestamptz
```
- Global default seeded with our current narration prompt, exposed in Admin Settings as a multiline editor with placeholders: `{{title}}`, `{{bullets}}`, `{{courseTitle}}`, `{{tone}}`, `{{depth}}`, `{{audience}}`.
- `courses` gets new columns: `tone text`, `tech_depth int (1-5)`, `audience text`, `prompt_override text null`.
- Course edit page gains a "Narration Settings" section: tone select (Conversational / Formal / Energetic / Socratic), depth slider 1–5, audience text, and a per-course "Override prompt" textarea.
- Resolution order at generation time: slide hint → course override → global template → built-in default.

## 3. Per-Slide Regeneration + Custom Hints

- Each slide row in the admin course editor gets:
  - "Regenerate narration" button (`regenerateSlideNarration({ slideId, hint? })`).
  - "Custom hint" inline textarea (persisted to `slides.generation_hint`).
- Hint is appended to the resolved prompt as `EXTRA INSTRUCTION FOR THIS SLIDE: …`.
- Regenerating one slide rewrites only that slide's narration and re-runs TTS for that single slide (existing yavar TTS pipeline, unchanged).

## 4. Optional AI Illustrations (Opt-In Per Slide)

- New column `slides.illustration_url text null`.
- Admin slide list: checkbox per slide "Generate illustration" + "Generate selected" button → `generateSlideIllustrations({ slideIds })` using `google/gemini-3.1-flash-image-preview` (or Pro via the admin's Google key if set) with a fixed style preamble ("flat editorial vector, soft pastel palette, no text") for visual consistency.
- Output stored to `course-uploads` bucket; URL saved on the slide.
- `LearningScene` renders the illustration in Hero/Spotlight scenes when present; falls back to the icon library otherwise.
- Opt-in only — never auto-generated for every slide, to keep cost predictable.

## 5. Contextual Icons (No Image Gen, No External Calls)

- During narration generation the model also returns 1–3 keywords per slide in the same JSON: `{ narrations: [...], keywords: [["classification","fruit"], ...] }`.
- Static dictionary `src/lib/iconMap.ts` (~120 entries) maps keywords → Lucide icon names; unknown keys fall back to a generic icon.
- Persist `slides.icon_keywords text[]` and render Lucide icons in `LearningScene` grid/flow/spotlight tiles instead of the current hardcoded `✦ ◆ ▲`.

## 6. TTS

Out of scope — existing yavar TTS stays as-is.

## 7. Database Migration

```sql
ALTER TABLE courses
  ADD COLUMN tone text DEFAULT 'conversational',
  ADD COLUMN tech_depth int DEFAULT 3,
  ADD COLUMN audience text DEFAULT 'business professionals',
  ADD COLUMN prompt_override text;

ALTER TABLE slides
  ADD COLUMN generation_hint text,
  ADD COLUMN illustration_url text,
  ADD COLUMN icon_keywords text[];

CREATE TABLE prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  template text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON prompt_templates TO authenticated;
GRANT ALL ON prompt_templates TO service_role;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage templates" ON prompt_templates
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
-- seed one global row with current prompt
```

## 8. Files

**New**
- `src/routes/_authenticated/admin.settings.tsx` — key entry + global prompt editor + model status
- `src/lib/narrationModel.server.ts` — Pro-vs-Flash router
- `src/lib/promptResolver.server.ts` — slide → course → global → default
- `src/lib/iconMap.ts` — keyword → Lucide name dictionary

**Edited**
- `src/lib/narration.functions.ts` — accept courseId/slideId, resolve prompt, return `modelUsed` + keywords
- `src/routes/_authenticated/admin.courses.$courseId.tsx` — tone/depth/audience/prompt-override UI, per-slide hint + regenerate + illustration checkbox + model badge
- `src/components/LearningScene.tsx` — render `illustration_url` and `icon_keywords`

## 9. Out of Scope (Explicit)

- Per-admin keys (one admin → one workspace secret).
- Live web image search (static Lucide library covers the "contextual icon" need without HTTP).
- Bulk illustration generation (per-slide opt-in only).
- TTS changes (yavar TTS stays as-is).

## Secret Request

After plan approval, I'll trigger the secure form for `GEMINI_API_KEY`. You paste once; it never appears in code or chat.
