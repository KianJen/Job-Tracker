# Storage and backend options

## Phase 1 — localStorage (already working)

The prototype stores everything in `localStorage` under two keys:
- `jobs_v2` — JSON array of Job objects
- `docs_v1` — JSON array of JobDocument objects

In the React port, use Zustand's `persist` middleware to replicate this with zero extra code:

```ts
import { persist } from 'zustand/middleware';
// wrap your store with persist({ name: 'job-tracker-store' })
```

**Limitations:** data is browser-local, no cross-device sync, wiped if user clears browser storage.

## Phase 2 — Cloud sync options

### Option A: Supabase (recommended for most people)
- Hosted Postgres with a generous free tier
- Built-in Auth (Google/GitHub OAuth or email)
- Real-time subscriptions (live updates across tabs/devices)
- SDK: `@supabase/supabase-js`

**Schema:**
```sql
create table jobs (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users not null,
  company text not null,
  role text not null,
  status text not null,
  applied date,
  interview date,
  followup date,
  notes text,
  created_at timestamptz default now()
);

create table documents (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users not null,
  type text not null check (type in ('resume', 'cover')),
  name text not null,
  content text,
  updated date,
  created_at timestamptz default now()
);

create table document_jobs (
  document_id bigint references documents(id) on delete cascade,
  job_id bigint references jobs(id) on delete cascade,
  primary key (document_id, job_id)
);
```

### Option B: PocketBase (self-hosted, single binary)
- Single Go binary, runs on any VPS
- Built-in admin UI, Auth, file storage
- Good for self-hosters who don't want a cloud dependency
- SDK: `pocketbase/js-sdk`

### Option C: JSON file on disk (Tauri / Electron)
- If building as a desktop app, write JSON to `~/.job-tracker/data.json`
- Use Tauri's `fs` plugin or Node.js `fs` module
- No server needed, full offline support

## Migration path

The store abstraction in `src/utils/storage.ts` should be a thin adapter so you can swap backends without touching components:

```ts
// src/utils/storage.ts
export interface StorageAdapter {
  getJobs(): Promise<Job[]>;
  saveJob(job: Job): Promise<Job>;
  deleteJob(id: number): Promise<void>;
  getDocs(): Promise<JobDocument[]>;
  saveDoc(doc: JobDocument): Promise<JobDocument>;
  deleteDoc(id: number): Promise<void>;
}
```

Implement `LocalStorageAdapter` first, then swap in `SupabaseAdapter` when ready.
