## Plan: per-slide strict generation, regenerate first 10, then audit

### Hard rule (per your instruction)
**Work one slide at a time.** Every Gemini call sends exactly ONE slide. No batching of multiple slides into a single request — that was the root cause of truncated/empty output.

### What I will change

1. **Per-slide generation loop**
   - Both initial generation and "regenerate first N" loop through slides sequentially.
   - Each iteration: one slide -> one Gemini call -> validate -> save -> next.
   - Progress is visible per slide in the admin UI.

2. **Bullet repair before sending to AI**
   - Merge broken OCR fragments into whole sentences.
   - Drop noise, deduplicate.
   - Gives Gemini coherent source content instead of mid-sentence pieces.

3. **Strict scene quality gate (no silent fallback)**
   Each scene must have:
   - 1-3 word concept name
   - Intro, takeaway
   - At least an analogy OR example diagram, AND a technical pipeline diagram
   - Multi-phase narration covering at least 2 of analogy/example/technical
   
   Invalid -> automatic retry with a stricter follow-up prompt (max 2 attempts). If still invalid, the slide is marked failed in the admin UI rather than saving weak content.

4. **Force concept splitting**
   - Prompt instructs Gemini to split multi-concept slides (e.g. Perception / Language / Prediction / Decision) into separate scenes — one concept per scene.

5. **New "Regenerate first 10 slides" admin control**
   - Button in the Slides section of the course editor.
   - Calls a new server function that processes slides 1-10 one at a time.
   - Shows per-slide result: scene count, attempts, model used, or error.
   - Reloads the slide list when done.

6. **Better generation logs**
   - Each per-slide call is its own log row, with kind `scene-range` / `scene-regenerate` / `scene-generation`.
   - Existing admin Logs view already surfaces these — no new UI needed.

7. **Re-investigate after regeneration**
   - Once you regenerate the first 10 slides of the AI beginner course, I will query the database, read the stored scene blocks, and report honestly:
     - Scenes per source slide
     - Which scenes have analogy / example / technical diagrams
     - Whether narration phases line up
     - Whether the strict gate actually rejected weak output
     - Which model was used per slide

### Files touched
- `src/lib/narration.functions.ts` — bullet repair, validation, per-slide helper, new `regenerateSlideRange` server fn, removed silent fallback.
- `src/routes/_authenticated/admin.courses.$courseId.tsx` — add "Regenerate first 10" button + per-slide progress + result list.

### Acceptance criteria
- Each Gemini request contains exactly one slide.
- No scene is stored unless it passes the quality gate.
- First-10 regeneration completes with a clear per-slide report.
- Multi-concept source slides produce multiple scenes.
- Post-run audit is provided honestly, not as a generic success message.