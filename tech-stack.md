# Tech stack

## Recommended stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Most familiar, best ecosystem for this kind of data-driven UI |
| Build tool | Vite | Fast dev server, minimal config |
| Styling | Tailwind CSS | Utility-first, great for component-scoped styles, easy dark mode |
| State management | Zustand | Minimal boilerplate, works great for a flat store like this |
| Storage (phase 1) | localStorage via custom hook | Zero setup, matches prototype behavior exactly |
| Storage (phase 2) | Supabase or PocketBase | See storage doc for details |
| Icons | Tabler Icons (React) | Used in prototype (`@tabler/icons-react`) |

## Scaffolding command

```bash
npm create vite@latest job-tracker -- --template react-ts
cd job-tracker
npm install
npm install zustand @tabler/icons-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Zustand store shape

```ts
// src/store/useJobStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Job, JobDocument } from '../types';

interface JobStore {
  jobs: Job[];
  docs: JobDocument[];
  addJob: (job: Omit<Job, 'id'>) => void;
  updateJob: (id: number, patch: Partial<Job>) => void;
  deleteJob: (id: number) => void;
  addDoc: (doc: Omit<JobDocument, 'id'>) => void;
  updateDoc: (id: number, patch: Partial<JobDocument>) => void;
  deleteDoc: (id: number) => void;
  toggleDocJob: (docId: number, jobId: number, linked: boolean) => void;
}

export const useJobStore = create<JobStore>()(
  persist(
    (set) => ({
      jobs: seedJobs,
      docs: seedDocs,
      addJob: (job) => set((s) => ({ jobs: [{ ...job, id: Date.now() }, ...s.jobs] })),
      updateJob: (id, patch) => set((s) => ({ jobs: s.jobs.map((j) => j.id === id ? { ...j, ...patch } : j) })),
      deleteJob: (id) => set((s) => ({
        jobs: s.jobs.filter((j) => j.id !== id),
        docs: s.docs.map((d) => ({ ...d, linkedJobs: d.linkedJobs.filter((x) => x !== id) })),
      })),
      addDoc: (doc) => set((s) => ({ docs: [{ ...doc, id: Date.now() }, ...s.docs] })),
      updateDoc: (id, patch) => set((s) => ({ docs: s.docs.map((d) => d.id === id ? { ...d, ...patch } : d) })),
      deleteDoc: (id) => set((s) => ({ docs: s.docs.filter((d) => d.id !== id) })),
      toggleDocJob: (docId, jobId, linked) => set((s) => ({
        docs: s.docs.map((d) => d.id !== docId ? d : {
          ...d,
          linkedJobs: linked
            ? [...new Set([...d.linkedJobs, jobId])]
            : d.linkedJobs.filter((x) => x !== jobId),
        }),
      })),
    }),
    { name: 'job-tracker-store' }
  )
);
```

## Alternative stacks considered

### If you want no build step
- Plain HTML/CSS/JS (the prototype is already this — see `docs/prototype.html`)
- Works great for personal use, hard to scale

### If you want a full-stack app
- Next.js (App Router) + Prisma + SQLite/Postgres
- Good if you want server-side rendering or a proper API layer
- Overkill for personal use unless you want to self-host with auth

### If you want a desktop app
- Tauri + React
- Bundles the app as a native desktop binary with file system access
- Good for offline-first use with local file storage (no server needed)
