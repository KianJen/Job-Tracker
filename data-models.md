# Data models

## Status type

```ts
export type JobStatus =
  | 'Phone screen'
  | 'Technical Interview'
  | 'Final Interview'
  | 'Offer'
  | 'Rejected'
  | 'Ghosted';
```

## Job

```ts
export interface Job {
  id: number;
  company: string;
  role: string;
  status: JobStatus;
  applied: string;      // ISO 8601 date string: 'YYYY-MM-DD'
  interview: string;    // ISO date, empty string if not set
  followup: string;     // ISO date, empty string if not set
  notes: string;
}
```

### Business rules
- `applied`, `interview`, `followup` are stored as ISO date strings (`''` when empty, not null/undefined — simplifies form binding)
- A follow-up is "overdue" when `followup < today()` AND status is not Offer, Rejected, or Ghosted
- "Active" jobs are those whose status is NOT Rejected or Ghosted

## Document

```ts
export type DocumentType = 'resume' | 'cover';

export interface JobDocument {
  id: number;
  type: DocumentType;
  name: string;         // Version label, e.g. 'v3 — tech roles' or 'Cover letter — Stripe'
  content: string;      // Full plain text of the resume or cover letter
  linkedJobs: number[]; // Array of Job IDs this document is associated with
  updated: string;      // ISO date of last content edit
}
```

### Business rules
- `linkedJobs` is a many-to-many: one document can link to many jobs, one job can have many documents
- When a job is deleted, its ID should be removed from all `linkedJobs` arrays
- `updated` should be set to `today()` whenever `content` changes
- `name` is user-defined — no uniqueness constraint needed

## Seed data (matches prototype)

### Jobs
```ts
const seedJobs: Job[] = [
  { id: 1, company: 'Stripe', role: 'Senior Frontend Engineer', status: 'Technical Interview', applied: '2026-05-15', interview: '2026-06-18', followup: '2026-06-14', notes: 'Spoke with Alex from recruiting. Stack: React + TypeScript. System design round next week.' },
  { id: 2, company: 'Figma', role: 'Product Engineer', status: 'Final Interview', applied: '2026-05-02', interview: '2026-06-12', followup: '2026-06-11', notes: 'Three rounds down. Panel interview with design + eng leads Thursday.' },
  { id: 3, company: 'Linear', role: 'Full-Stack Engineer', status: 'Phone screen', applied: '2026-06-01', interview: '', followup: '2026-06-20', notes: 'Reached out via LinkedIn. Intro call scheduled.' },
  { id: 4, company: 'Vercel', role: 'Developer Advocate', status: 'Offer', applied: '2026-04-20', interview: '2026-05-30', followup: '', notes: 'Offer: $165k + equity. Deadline Jun 20.' },
  { id: 5, company: 'Notion', role: 'Software Engineer II', status: 'Ghosted', applied: '2026-04-10', interview: '', followup: '', notes: 'Applied through careers page. No response after recruiter screen.' },
  { id: 6, company: 'Loom', role: 'Frontend Engineer', status: 'Rejected', applied: '2026-05-25', interview: '2026-06-03', followup: '', notes: 'Rejected after technical round.' },
];
```

### Documents
```ts
const seedDocs: JobDocument[] = [
  {
    id: 101,
    type: 'resume',
    name: 'Software engineer — general',
    linkedJobs: [1, 2, 3, 4, 5, 6],
    content: `Jane Doe\njane@example.com · github.com/janedoe\n\nEXPERIENCE\n...`,
    updated: '2026-06-01',
  },
  {
    id: 102,
    type: 'cover',
    name: 'Cover letter — Stripe',
    linkedJobs: [1],
    content: `Dear Stripe Hiring Team,\n\n...`,
    updated: '2026-05-14',
  },
  {
    id: 103,
    type: 'cover',
    name: 'Cover letter — Figma',
    linkedJobs: [2],
    content: `Hi Figma Team,\n\n...`,
    updated: '2026-05-01',
  },
];
```
