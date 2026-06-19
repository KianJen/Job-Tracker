# Job Tracker — Claude Code Project Context

## Project overview

A self-hosted **job application tracking app**. It started as a single-file HTML
prototype (built in a Claude.ai chat) and is now a full-stack application:

- **Frontend:** React + TypeScript (Vite), served by nginx
- **Backend:** FastAPI + Postgres + Garage (S3-compatible object storage)
- **Deployment:** Docker Compose, running on a home-network LXC (Proxmox), with a
  GitHub Actions CI/CD pipeline that auto-deploys on push to `main`

The app has two tabs — **Applications** and **Documents** — and is single-user (no auth).

## Architecture

```
Browser ──▶ nginx (port 80) ──┬──▶ static React bundle (SPA)
                              └──▶ /api/* proxied to FastAPI (api:8000)
                                          │
                                          ├──▶ Postgres        (structured data)
                                          └──▶ Garage (S3 API) (PDF/DOCX files)
```

- The frontend makes API calls to **relative** `/api/*` URLs; nginx ([nginx.conf](nginx.conf))
  proxies them to the `api` container. This is why `VITE_API_URL` can be empty in the
  Docker build — no server IP is baked into the bundle.
- File downloads are **proxied through the API** (`GET /api/documents/{id}/file`), not via
  presigned URLs, so Garage never needs to be reachable from the browser and stays on the
  private Docker network.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend framework | React 18 + TypeScript, Vite 6 |
| State | Zustand 5 (`useShallow` for object selectors — see note below) |
| Styling | Plain CSS with custom properties in [src/index.css](src/index.css) — **no Tailwind**; Tabler Icons webfont via CDN |
| Backend | FastAPI + Uvicorn |
| ORM / DB driver | SQLAlchemy 2.0 (async) + asyncpg |
| Database | Postgres 16 |
| Object storage | Garage v1.0 (S3 API via boto3) |
| Containerization | Docker Compose |
| CI/CD | GitHub Actions |

## Data models

TypeScript types live in [src/types/index.ts](src/types/index.ts); the backend mirrors them
in [backend/app/schemas.py](backend/app/schemas.py).

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

### Doc
```ts
{
  id: number,
  type: 'resume' | 'cover',
  name: string,          // version label e.g. 'v3 — tech roles'
  content: string,       // freeform notes / text
  linkedJobs: number[],  // array of job IDs
  updated: string,       // ISO date
  fileName?: string,     // set when a PDF/DOCX is attached
  fileUrl?: string       // absolute link to the API download endpoint
}
```

The `fileName` / `fileUrl` fields back the document **file attachment** feature: a PDF or
DOCX is uploaded to Garage, its object key is stored in Postgres, and `fileUrl` points at
the API's download endpoint.

## API surface

Base prefix `/api`. Full table is in [backend/README.md](backend/README.md). Summary:

- **Jobs:** `GET|POST /jobs`, `GET|PATCH|DELETE /jobs/{id}`
- **Documents:** `GET|POST /documents`, `GET|PATCH|DELETE /documents/{id}`
- **Document files:** `POST|GET|DELETE /documents/{id}/file` (multipart upload, PDF/DOCX only)
- **Health:** `GET /api/health`

PATCH endpoints are partial updates (`exclude_unset`). Interactive docs at `/docs` when the
API is running.

## State management notes

- The Zustand store is [src/store/useStore.ts](src/store/useStore.ts). It holds `jobs`,
  `docs`, UI state (active tab, expanded card, search/filter), plus `loading`/`error`.
- `load()` fetches jobs + docs in parallel on app mount.
- **Field edits are optimistic + debounced (500ms):** `updateJob`/`updateDoc` update local
  state immediately, then PATCH after the user stops typing. Toggling job↔doc links and
  file uploads fire immediately (no debounce).
- **`useShallow` is required** anywhere a selector returns an object literal
  (`useStore(useShallow(s => ({ ... })))`). Without it, the new object identity each render
  fails Zustand's equality check and causes an infinite re-render loop (this was the cause
  of an earlier "grey screen" bug).

## Status system

| Status | Color ramp | Meaning |
|---|---|---|
| Phone screen | Teal | Initial recruiter/HR call |
| Technical Interview | Blue | Technical assessment round |
| Final Interview | Purple | Final round / exec / panel |
| Offer | Green | Offer received |
| Rejected | Red | Rejected at any stage |
| Ghosted | Gray | No response after application or interview |

Status → CSS class mapping is in [src/utils/status.ts](src/utils/status.ts).

## File structure

```
job-tracker/
├── CLAUDE.md                   ← this file
├── Dockerfile                  ← frontend: node build → nginx serve
├── nginx.conf                  ← SPA routing + /api/* proxy to the api container
├── index.html                  ← Vite entry point
├── package.json / tsconfig*.json / vite.config.ts
├── .github/workflows/ci-cd.yml ← CI (build/typecheck) + CD (self-hosted deploy)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css               ← all styles + design tokens (CSS custom properties)
│   ├── api/
│   │   └── client.ts           ← typed fetch wrapper around the API
│   ├── store/
│   │   └── useStore.ts         ← Zustand store (jobs + docs + UI state)
│   ├── components/
│   │   ├── JobCard.tsx         ← expandable inline-edit job card
│   │   ├── JobModal.tsx        ← "Add application" modal
│   │   ├── DocCard.tsx         ← document card + file attach/replace/remove
│   │   ├── DocModal.tsx        ← "Add document" modal (with file upload)
│   │   └── StatsBar.tsx        ← Total / Active / Offers / Follow-ups due
│   ├── types/
│   │   └── index.ts            ← Job, Doc, Status types
│   └── utils/
│       ├── dates.ts            ← today(), fmtDate(), isOverdue()
│       └── status.ts           ← status → CSS class, initials()
└── backend/
    ├── Dockerfile              ← python:3.12-slim + uvicorn
    ├── docker-compose.yml      ← postgres + garage + api + frontend (project name: backend)
    ├── requirements.txt
    ├── README.md               ← backend setup + API reference
    ├── .env                    ← Garage creds + HOST_IP (gitignored — never commit)
    ├── app/
    │   ├── main.py             ← app, CORS, lifespan (create_all + ensure_bucket)
    │   ├── config.py           ← pydantic-settings (env-driven)
    │   ├── database.py         ← async engine + session
    │   ├── models.py           ← Job, Document, document_jobs (many-to-many)
    │   ├── schemas.py          ← pydantic schemas + serialize_document()
    │   ├── storage.py          ← boto3 wrapper for Garage
    │   └── routers/
    │       ├── jobs.py
    │       └── documents.py
    ├── garage/garage.toml      ← single-node Garage config
    └── scripts/                ← init-garage.ps1 / .sh (one-time cluster setup)
```

## Local development

```bash
# Frontend (expects the API running on :8000)
npm install
npm run dev            # Vite dev server on http://localhost:5173

# Backend — see backend/README.md for the full Postgres + Garage setup
```

In dev, the Vite server doesn't go through nginx, so set `VITE_API_URL=http://localhost:8000`
(see [.env.example](.env.example)).

## Deployment & CI/CD

- **Compose:** `docker compose -f backend/docker-compose.yml up -d --build` brings up all
  four services. The project name is pinned to `backend` so deploys from any directory reuse
  the same named volumes (`backend_pgdata`, `backend_garage_meta`, `backend_garage_data`).
- **Garage init is a manual one-time step** (`backend/scripts/init-garage.*`) because Garage
  generates the S3 access key at runtime; the printed Key ID + secret go into `backend/.env`.
- **CI/CD** ([.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)):
  - `frontend` + `backend` jobs run on GitHub-hosted runners (build, type-check, syntax).
  - `deploy` runs on a **self-hosted runner on the LXC** (label `job-tracker`), only on push
    to `main` and only after CI passes. It writes `backend/.env` from repo **secrets**
    (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) and the `HOST_IP` **variable**, then rebuilds
    and restarts the stack.
- **`HOST_IP`** (the LXC's LAN IP) feeds `PUBLIC_BASE_URL` and `CORS_ORIGINS` so file-download
  URLs and CORS point at the address the browser actually uses.

> Security: `backend/.env` holds real Garage credentials and is gitignored. Never commit it.
> The source of truth for the deployed credentials is the GitHub Actions secrets.

## Design notes

- Clean, flat UI — no gradients or drop shadows
- All colors are CSS custom properties; dark mode is automatic via
  `@media (prefers-color-scheme: dark)` (no manual toggle yet)
- Status colors encode meaning, not sequence
- Typography: system sans-serif, two weights only (400 and 500)
- Card-based layout with 0.5px borders, 12px border-radius
- Destructive actions (delete) are secondary — no accidental loss

## Implemented features

- [x] Job list with expandable inline-edit cards
- [x] Status badges with color coding
- [x] Summary stats bar (Total, Active, Offers, Follow-ups due)
- [x] Search + status filter (jobs and documents)
- [x] Overdue follow-up highlighting
- [x] Documents vault (resume + cover letter)
- [x] Document ↔ job linking (bidirectional) + jump-to-document from a job card
- [x] PDF/DOCX file attachments stored in object storage
- [x] Persistent server-side storage (Postgres + Garage) — shared across devices on the LAN
- [x] Automatic dark mode (prefers-color-scheme)
- [x] Containerized deployment + CI/CD

## Possible next features

- [ ] Authentication (currently single-user, no auth — required before any public exposure)
- [ ] Kanban board view (columns per status, drag-and-drop)
- [ ] AI-powered cover letter generation per job (Claude API)
- [ ] Export to CSV / PDF
- [ ] Email/calendar integration for interview reminders
- [ ] Manual dark mode toggle
- [ ] Alembic migrations (schema is currently auto-created via `create_all` on startup)
