# TaskFlow — Kanban Project Management App

A Trello-style task management web app built as a **48-hour MVP**. TaskFlow supports account registration and sign-in, individual boards, columns, and cards with drag-and-drop ordering that persists between sessions.

**Tech stack:** Next.js 14 · React · TypeScript · Supabase Auth + PostgreSQL · dnd-kit · Vercel

**Demo:** https://taskflow-kanban-three.vercel.app  
**Source:** https://github.com/ozandokur/taskflow-kanban

> The demo URL is from the original project documentation. Deployment availability has not been independently verified.

## Key features

- Email/password registration and authentication via Supabase
- Create boards and organize tasks into columns
- Create and edit card titles and descriptions
- Move cards across columns using drag-and-drop
- Persist card positions in PostgreSQL so ordering survives refreshes
- Responsive interface for desktop and mobile devices

## Implementation details

### Persistent drag-and-drop

TaskFlow uses `@dnd-kit/core` and `@dnd-kit/sortable` for card interactions. Each card stores a `position` value; when cards move between columns or change order, their positions are updated in the database.

### Authentication and storage

- Supabase Auth handles identity and sessions.
- Supabase PostgreSQL stores user profiles, boards, columns, and cards.
- The application uses the `@supabase/ssr` client integration in Next.js.
- User-scoped access should be enforced using **Row Level Security (RLS)** in the Supabase project.

### Data model

| Table | Main fields |
| --- | --- |
| `profiles` | `id`, `full_name`, `email`, `created_at` |
| `boards` | `id`, `owner_id`, `title`, `created_at` |
| `columns` | `id`, `board_id`, `title`, `position`, `created_at` |
| `cards` | `id`, `board_id`, `column_id`, `title`, `description`, `position`, `created_at`, `updated_at` |

## Run locally

Requires Node.js, npm, and a configured Supabase project.

```bash
git clone https://github.com/ozandokur/taskflow-kanban.git
cd taskflow-kanban
npm ci
cp .env.example .env.local
npm run dev
```

Set your own `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values in `.env.local`, then visit **http://localhost:3000**.

**Database setup:** The repository does not include a complete Supabase SQL migration or RLS policy bundle. Set up the four tables and user-scoped RLS policies in your Supabase project before using the app. Do not put a Supabase service-role key in a `NEXT_PUBLIC_*` variable.

## MVP boundaries

The original 48-hour scope deliberately prioritized authentication, core board/card workflows, responsive layout, and persisted ordering.

Not included in the MVP: real-time collaboration, board sharing, activity history, due dates, assignees, and comments. Those are potential future enhancements, **not current features**.

## What this project demonstrates

Full-stack TypeScript development, authentication integration, relational data modeling, stateful drag-and-drop interactions, and prioritization under a strict development deadline.
