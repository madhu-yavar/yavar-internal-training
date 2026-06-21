RCA
- The admin prompt currently affects only `narration_text` and keyword extraction. It does not change the visual scene structure in the learner player.
- The original deck rows remain as `body_md`; the player still renders those original bullets as cards/flow/grid. So even if narration improves, the visible “video” looks mostly identical.
- Regeneration creates one output per original slide. It does not split a dense slide like “Perception / Language / Prediction / Decision” into four learning scenes, which your prompt explicitly requires.
- The player reveals narration sentence-by-sentence, but the visual state is driven by bullet index. This causes voice-over and visuals to feel loosely connected.
- The current scene component uses generic templates (`flow`, `grid`, `spotlight`, `takeaway`) rather than concept-specific diagrams such as `Camera -> AI Model -> Prediction`.

Plan
1. Change AI generation output from “narrations + keywords” to structured learning scenes.
   - Each generated scene will contain: concept, analogy steps, real-world example steps, technical explanation steps, takeaway, narration, visual keywords.
   - The prompt will explicitly require splitting multi-concept slides into multiple scenes.
   - Keep backward compatibility so old courses still play.

2. Store generated scenes inside each slide’s generated metadata.
   - Reuse the existing hidden generated-material block in `body_md` instead of adding unnecessary tables.
   - During “Generate learning material”, replace the old generated block every time so regeneration visibly changes the learner material.

3. Update the learner player to render generated scenes first.
   - If generated learning scenes exist, the learner view will play those scenes, not the original raw deck bullets.
   - Dense source slides can become multiple learner scenes.
   - Progress will count learner scenes, while retaining source slide references for admin traceability.

4. Replace generic bullet animation with concept teaching diagrams.
   - Render one concept per screen.
   - Show three focused diagram modes based on the scene data:
     ```text
     Analogy:       Human Eye -> Brain -> Decision
     Example:       Traffic Camera -> Detect Pedestrian -> Warn Driver
     Technical:     Image -> Feature Extraction -> Model -> Classification
     ```
   - Animate icons/nodes/arrows, not line-by-line text blocks.
   - Keep screen density to one concept, one diagram, one example.

5. Make voice and visuals coincide.
   - Narration lines will map to the active phase: introduce, analogy, example, technical, recap.
   - The current visual phase will advance with the spoken line instead of unrelated bullet index.

6. Improve admin transparency and logs.
   - Log `scene-generation` separately from single-slide narration.
   - Show the exact Gemini model used, slide count in, scene count out, duration, and whether the admin prompt/course override was used.
   - Keep Yavar TTS model/voice visible in settings and learner/admin UI.

7. Guard against “same video produced”.
   - Add a clear admin status after regeneration: “Generated X learner scenes from Y source slides using [model]”.
   - Ensure regenerate always rewrites generated scene metadata and narration, not just fills missing values.

Files expected to change
- `src/lib/narration.functions.ts`
- `src/lib/courseMaterial.ts`
- `src/components/LearningScene.tsx`
- `src/routes/_authenticated/learn.$courseId.tsx`
- `src/routes/_authenticated/admin.courses.$courseId.tsx`
- `src/routes/_authenticated/admin.settings.tsx`