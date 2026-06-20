# Plan: Rebrand + Learner Experience

## 1. Rebrand

Rename product from "Yavar Training" to **"Ari Learn"** (Ari is already our in-course AI tutor — keeps the brand coherent).

- Update landing page (`src/routes/index.tsx`) with meaningful hero: headline, subhead, 3 feature blurbs (AI-narrated slides, Ari tutor chat, adaptive quizzes), CTA buttons (Sign in / Browse courses), footer.
- Update titles/meta in `__root.tsx` and route `head()` blocks.
- Update header brand text on auth, learn dashboard, admin.

> **"Yavar Learn with Ari"**

## 2. Learner Login & Dashboard

The auth flow already exists. We'll enrich the post-login experience on `/learn`:

**Course cards show per-user status**, computed from existing tables:

- `Not started` → no `slide_views` rows
- `In progress X%` → `count(distinct slide_views.slide_id) / total_slides`
- `Completed` → all slides viewed AND at least one quiz attempt ≥ pass mark
- Best quiz score badge

## 3. Quiz Retakes + Attempt History

- New table `quiz_attempts` (user_id, course_id, score, total, taken_at) with RLS (user reads/writes own; admin reads all).
- After quiz submit → insert attempt row.
- Show "Best: 17/20 · Attempts: 4 · Retake" on course card and quiz screen.
- Unlimited retakes; each draws a fresh random 20.

## 4. Message Admin (Requests / Corrections)

- New table `course_requests` (id, user_id, course_id nullable, type: `new_course`|`correction`|`question`, subject, body, status: `open`|`responded`|`closed`, admin_reply, created_at).
- RLS: user inserts/reads own; admin reads all + updates status/reply.
- Learner UI:
  - "💬 Message Ari Team" button on dashboard → modal with type + subject + message.
  - Inside a course → "Suggest a correction" prefilled with course id.
  - "My requests" panel showing status + admin reply.
- Admin UI:
  - New `/admin/requests` page listing all requests with filters, reply box, mark resolved.

## 5. Technical notes

- Tables added via migration with GRANTs + RLS using existing `has_role(uid,'admin')`.
- Progress computed via a single `getLearnerDashboard` server fn (`requireSupabaseAuth`) returning `{courses, progress, attempts, openRequests}` to avoid N+1.
- Quiz attempt insert via server fn; admin reply via server fn checking `has_role`.
- No changes to slides/SRT/TTS pipeline.

## Out of scope (ask if you want them)

- Certificates / PDF completion proof
- Email notifications when admin replies
- Leaderboards