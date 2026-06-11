# Job Tracker — Claude Code Project Context

## Project overview

This is a **frontend job application tracking app** designed and prototyped in a Claude.ai chat session. The goal is to take the working interactive prototype and build it out as a proper frontend project (React recommended) with persistent storage, a clean component architecture, and potential for further features.

## What was built in the prototype

A fully interactive single-page app with two main sections:

### 1. Applications tab
- Lists job applications as expandable cards
- Each card stores: Company, Role, Status, Applied date, Interview date, Follow-up reminder date, Notes
- Summary stats bar: Total, Active, Offers, Follow-ups due
- Search (by company or role) and filter by status
- Inline editing — all fields editable directly on the expanded card
- Overdue follow-up reminders highlighted in amber with ⚠ indicator
- Delete per card

### 2. Documents tab
- Stores resumes and cover letters as text documents
- Each document has: Type (resume / cover letter), Version label, Full text content, Linked job applications, Last updated date
- Documents can be linked to one or more job applications via checkboxes
- From a job card, linked documents appear as chips — clicking one jumps to the Documents tab and opens that document
- Search by name or content, filter by type (resume / cover letter)

### Navigation
- Two-tab nav: Applications | Documents
- Tab switching is instant, state is preserved

## Data models

See `docs/data-models.md` for full TypeScript interfaces.

### Job
```ts
{
  id: number,
  company: string,
  role: string,
  status: 'Phone screen' | 'Technical Interview' | 'Final Interview' | 'Offer' | 'Rejected' | 'Ghosted',
  applied: string,       // ISO date e.g. '2026-05-15'
  interview: string,     // ISO date, optional
  followup: string,      // ISO date, optional
  notes: string
}
```

### Document
```ts
{
  id: number,
  type: 'resume' | 'cover',
  name: string,          // version label e.g. 'v3 — tech roles'
  content: string,       // full text
  linkedJobs: number[],  // array of job IDs
  updated: string        // ISO date
}
```

## Status system

| Status | Color ramp | Meaning |
|---|---|---|
| Phone screen | Teal | Initial recruiter/HR call |
| Technical Interview | Blue | Technical assessment round |
| Final Interview | Purple | Final round / exec / panel |
| Offer | Green | Offer received |
| Rejected | Red | Rejected at any stage |
| Ghosted | Gray | No response after application or interview |

## Current storage

The prototype uses `localStorage` with keys `jobs_v2` and `docs_v1`. The next step is to replace this with a real backend or a persistent cloud store. See `docs/storage-and-backend.md` for options.

## Recommended tech stack

See `docs/tech-stack.md` for full rationale and alternatives.

- **Framework:** React + TypeScript (Vite)
- **Styling:** Tailwind CSS
- **State:** Zustand (lightweight, no boilerplate)
- **Storage (phase 1):** localStorage via a custom hook, same as prototype
- **Storage (phase 2):** Supabase (Postgres + Auth) or PocketBase for self-hosted

## Features already in the prototype (to implement)

- [ ] Job list with expandable inline-edit cards
- [ ] Status badges with color coding
- [ ] Summary stats bar (Total, Active, Offers, Follow-ups due)
- [ ] Search + status filter
- [ ] Overdue follow-up highlighting
- [ ] Documents vault (resume + cover letter storage)
- [ ] Document ↔ job linking (bidirectional)
- [ ] Jump-to-document from job card

## Planned / suggested next features (not yet built)

- [ ] Kanban board view (columns per status, drag-and-drop)
- [ ] Persistent cloud storage (cross-device sync)
- [ ] AI-powered cover letter generation per job (using Claude API)
- [ ] Export to CSV / PDF
- [ ] Email/calendar integration for interview reminders
- [ ] Dark mode toggle (prototype already uses CSS variables that support it)

## Design notes

The prototype was built with these design principles:

- Clean, flat UI — no gradients or drop shadows
- Uses CSS custom properties for all colors (light/dark mode ready)
- Status colors encode meaning, not sequence
- Typography: system sans-serif, two weights only (400 and 500)
- Card-based layout with 0.5px borders, 12px border-radius
- All destructive actions (delete) are secondary — no accidental loss

Full design token reference is in `docs/design-tokens.md`.

## File structure (suggested)

```
job-tracker/
├── CLAUDE.md                  ← this file
├── docs/
│   ├── data-models.md
│   ├── tech-stack.md
│   ├── storage-and-backend.md
│   └── design-tokens.md
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── store/
│   │   └── useJobStore.ts     ← Zustand store for jobs + docs
│   ├── components/
│   │   ├── JobCard.tsx
│   │   ├── JobForm.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentForm.tsx
│   │   ├── StatsBar.tsx
│   │   ├── StatusBadge.tsx
│   │   └── Toolbar.tsx
│   ├── types/
│   │   └── index.ts           ← Job, Document, Status types
│   └── utils/
│       ├── dates.ts
│       └── storage.ts
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Prototype source

The full working prototype HTML/JS (single file) is in `docs/prototype.html`. It can be opened directly in a browser and is the reference implementation for all behavior.
