
# End-to-End Training Platform Plan

You picked the full build. Because that's large, I'll deliver it in 3 sequential turns so each piece is verifiable. This plan covers all 3.

---

## Turn 1 — Foundation: Cloud, Auth, Roles, Schema, Shells

**Backend (Lovable Cloud)**
- Enable Cloud.
- Configure Auth: email OTP (magic-link / 6-digit code) for `madhugraj@gmail.com`.
- Migration creates:
  - `app_role` enum (`admin`, `user`), `user_roles` table + `has_role()` security-definer function.
  - `courses` (id, title, description, cover_url, voice, lang_code, published, created_at).
  - `slides` (id, course_id, idx, title, body_md, image_url, narration_text).
  - `srt_cues` (id, course_id, idx, start_ms, end_ms, text) — optional per slide.
  - `quiz_questions` (id, course_id, prompt, option_a..d, correct, explanation, hint, topic, difficulty).
  - `enrollments` (user_id, course_id, started_at, completed_at, last_slide_idx, score).
  - `slide_views` (user_id, course_id, slide_idx, viewed_at) for progress analytics.
  - Storage buckets: `course-assets` (public, for slide images / covers), `course-uploads` (private, for raw pdf/pptx/srt/json originals).
- RLS: admins full access via `has_role`; users read published courses + own enrollments/views.
- Trigger: auto-seed admin role for `madhugraj@gmail.com` on first signup.

**Frontend**
- Route tree:
  - `/auth` — email OTP login (public).
  - `/` — public landing → if signed in, redirect to `/learn`.
  - `/_authenticated/learn` — user dashboard, grid of course cards.
  - `/_authenticated/learn/$courseId` — learning player (current training UI, but data-driven from DB).
  - `/_authenticated/_admin/admin` — admin dashboard (gated by `has_role('admin')`).
  - `/_authenticated/_admin/admin/courses/$courseId` — course editor.
- Reuse current training player; swap hardcoded chapters/slides/quiz for DB fetches.

**Deliverable end of Turn 1:** Admin can log in, see empty admin shell; users can sign up; existing training still works (kept as a seeded "AI Enterprise Private LLM" course).

---

## Turn 2 — Admin Content Tools

- Course editor: create/edit course metadata, voice (Yavar voices), publish toggle, cover image upload.
- Slide manager: upload knowledge-base slide images (drag-drop, reorder, per-slide title + narration text). This matches your "knowledge base slide will be uploaded by the admin" preference — admin uploads pre-rendered slide images (PNG/JPG) like the current training deck.
- Optional bulk import: ZIP of images named `01.png`, `02.png`… auto-creates slides.
- SRT upload: parses `.srt` into `srt_cues` (drives captions + per-slide pacing).
- Quiz upload: accepts the same XLSX/JSON format you've been using; previews questions before save.
- Voice model picker per course (Yavar self-hosted endpoint + voice + speed defaults).

**Deliverable end of Turn 2:** Admin can build a complete course from uploaded slide images + SRT + quiz XLSX. Users immediately see it on `/learn`.

---

## Turn 3 — Auto-Play Video & Analytics

- "Video" generation = in-browser auto-play of slide deck with synchronized Yavar TTS narration, captions from SRT, advance on sentence end. Single "Play full lesson" button on the course card produces the lecture experience without rendering an MP4 (matches your choice).
- Per-slide reveal cards already supported; quiz at the end; remediation on wrong answers (already built).
- Progress tracking:
  - Log `slide_views` per slide; mark `enrollments.completed_at` when last slide + quiz done.
  - Save quiz score.
- Admin analytics dashboard:
  - Total enrolled / completed per course.
  - Completion rate, average score, average time to complete.
  - Per-user table: status, % progress, last activity, score.
  - Charts via Recharts (already in stack).

**Deliverable end of Turn 3:** Full loop — admin publishes a course, users take it, admin sees real-time progress.

---

## Open assumptions (tell me if any are wrong before I start Turn 1)

1. "Knowledge base slide" = pre-rendered slide images uploaded by admin (PNG/JPG), one per slide, in order. Not parsing the raw PPT/PDF on the server (Worker runtime can't run LibreOffice/Poppler).
2. OTP = Supabase email magic-link / 6-digit code. No password.
3. First admin = `madhugraj@gmail.com` (auto-promoted on signup via DB trigger). Additional admins promoted from inside the admin panel.
4. Existing hardcoded training stays accessible as a seeded course so nothing breaks during migration.
5. No SSO, no payments, no certificates this round.

If those are right, I'll start with Turn 1 next.
