# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered enterprise training platform built with TanStack Start (React SSR framework). The platform features an AI tutor named "Ari" who narrates training courses, answers questions, and administers quizzes. Users can upload PowerPoint presentations which are converted into interactive training courses with AI-generated content.

## Development Commands

**Package Manager:** This project uses [Bun](https://bun.sh) as the package manager and runtime.

```bash
# Start development server
bun dev

# Build for production
bun run build

# Build for development mode
bun run build:dev

# Preview production build
bun run preview

# Run ESLint
bun run lint

# Format code with Prettier
bun run format
```

## Architecture

### Tech Stack
- **Framework:** TanStack Start (SSR on top of Vite)
- **UI:** React 19, Shadcn/UI components (Radix UI + Tailwind CSS)
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Auth:** Supabase Auth with role-based access control (admin/user)
- **AI:** OpenAI-compatible gateway via AI SDK for React
- **Styling:** Tailwind CSS with CSS variables for theming

### Key Directories

- `src/routes/` - File-based routing with TanStack Router
  - `_authenticated/` - Protected routes (requires authentication)
    - `learn.*` - Course viewing and library
    - `admin.*` - Admin dashboard, course management, settings
  - `api/` - Server-side API endpoints (chat, TTS, quiz)
- `src/components/` - React components
  - `ui/` - Shadcn/UI component library (45+ components)
- `src/lib/` - Core business logic, utilities, and type definitions
- `src/integrations/supabase/` - Supabase client and auth integration
- `supabase/migrations/` - Database schema migrations

### Route Structure Pattern

TanStack Router uses file-based routing with special conventions:
- `__root.tsx` - Root layout
- `index.tsx` - Landing page (/)
- `_authenticated/route.tsx` - Layout wrapper for protected routes
- `learn.$courseId.tsx` - Dynamic route parameter ($courseId)
- `api/*.ts` - Server-side endpoints

### Database Schema

Key tables managed via Supabase migrations:
- `courses` - Training course definitions
- `slides` - Individual course slides with AI-generated content
- `quiz_questions` - Quiz questions linked to courses
- `enrollments` - User enrollment and progress tracking
- `user_roles` - Role-based access (admin/user)
- `course_requests` - User-submitted course requests
- `generation_logs` - AI content generation tracking

All tables use Row Level Security (RLS) policies for data isolation.

### AI Integration

The platform uses AI SDK for React with streaming:
- **Chat:** `/api/chat` endpoint for tutor conversations
- **TTS:** `/api/tts` for text-to-speech WebSocket streaming
- **Content Generation:** AI-generated slide content from uploaded PPT files

AI calls use an OpenAI-compatible gateway configured via environment variables.

### Authentication Flow

1. Users sign up/sign in via `/auth` routes
2. Supabase Auth manages session cookies
3. `_authenticated/route.tsx` checks session before allowing access
4. Role-based redirects (admin → `/admin`, user → `/learn`)

### State Management

- TanStack Query for server state caching and synchronization
- React hooks for local component state
- Supabase real-time subscriptions available

## Lovable Integration

This project is connected to [Lovable.dev](https://lovable.dev). **Important:** Avoid rewriting published git history (force pushing, rebasing, or squashing pushed commits) as this breaks Lovable's project history.

## Environment Setup

The project requires Supabase credentials and AI gateway configuration. See `.env.example` or existing `.env` for required environment variables:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- AI gateway credentials for content generation

## Code Conventions

- **Components:** Functional components with hooks
- **Styling:** Tailwind utility classes + CSS variables for theming
- **Types:** TypeScript with strict mode enabled
- **Imports:** Use `~` alias for `src/` directory (e.g., `~/components/ui/button`)
