import { create } from 'zustand'
import type { Job, Doc, Status } from '../types'
import { today } from '../utils/dates'

const STATUSES: Status[] = [
  'Phone screen', 'Technical Interview', 'Final Interview',
  'Offer', 'Rejected', 'Ghosted',
]

const seedJobs: Job[] = [
  { id: 1, company: 'Stripe', role: 'Senior Frontend Engineer', status: 'Technical Interview', applied: '2026-05-15', interview: '2026-06-18', followup: '2026-06-14', notes: 'Spoke with Alex from recruiting. Stack: React + TypeScript. System design round next week.' },
  { id: 2, company: 'Figma', role: 'Product Engineer', status: 'Final Interview', applied: '2026-05-02', interview: '2026-06-12', followup: '2026-06-11', notes: 'Three rounds down. Panel interview with design + eng leads Thursday.' },
  { id: 3, company: 'Linear', role: 'Full-Stack Engineer', status: 'Phone screen', applied: '2026-06-01', interview: '', followup: '2026-06-20', notes: 'Reached out via LinkedIn. Intro call scheduled.' },
  { id: 4, company: 'Vercel', role: 'Developer Advocate', status: 'Offer', applied: '2026-04-20', interview: '2026-05-30', followup: '', notes: 'Offer: $165k + equity. Deadline Jun 20.' },
  { id: 5, company: 'Notion', role: 'Software Engineer II', status: 'Ghosted', applied: '2026-04-10', interview: '', followup: '', notes: 'Applied through careers page. No response after recruiter screen.' },
  { id: 6, company: 'Loom', role: 'Frontend Engineer', status: 'Rejected', applied: '2026-05-25', interview: '2026-06-03', followup: '', notes: 'Rejected after technical round.' },
]

const seedDocs: Doc[] = [
  { id: 101, type: 'resume', name: 'Software engineer — general', linkedJobs: [1,2,3,4,5,6], content: 'Jane Doe\njane@example.com\n\nEXPERIENCE\nSenior Engineer, Acme Corp (2022–present)\nEngineer II, Startup Inc (2019–2022)\n\nEDUCATION\nB.S. Computer Science, State University, 2019\n\nSKILLS\nReact, TypeScript, Node.js, PostgreSQL', updated: '2026-06-01' },
  { id: 102, type: 'cover', name: 'Cover letter — Stripe', linkedJobs: [1], content: "Dear Stripe Hiring Team,\n\nI'm excited to apply for the Senior Frontend Engineer role.\n\nBest,\nJane Doe", updated: '2026-05-14' },
  { id: 103, type: 'cover', name: 'Cover letter — Figma', linkedJobs: [2], content: "Hi Figma Team,\n\nThe Product Engineer role appeals to me deeply.\n\nBest,\nJane Doe", updated: '2026-05-01' },
]

function loadJobs(): Job[] {
  try { return JSON.parse(localStorage.getItem('jobs_v2') || 'null') ?? seedJobs } catch { return seedJobs }
}
function loadDocs(): Doc[] {
  try { return JSON.parse(localStorage.getItem('docs_v1') || 'null') ?? seedDocs } catch { return seedDocs }
}

interface StoreState {
  jobs: Job[]
  docs: Doc[]
  tab: 'jobs' | 'docs'
  expandedJob: number | null
  expandedDoc: number | null
  jobSearch: string
  jobStatusFilter: string
  docSearch: string
  docTypeFilter: string

  setTab: (tab: 'jobs' | 'docs') => void
  setExpandedJob: (id: number | null) => void
  setExpandedDoc: (id: number | null) => void
  setJobSearch: (q: string) => void
  setJobStatusFilter: (s: string) => void
  setDocSearch: (q: string) => void
  setDocTypeFilter: (t: string) => void

  addJob: (company: string, role: string, status: Status, applied: string, notes: string) => number
  updateJob: (id: number, field: keyof Job, val: string) => void
  deleteJob: (id: number) => void

  addDoc: (type: 'resume' | 'cover', name: string, content: string, linkedJobs: number[], fileName?: string, fileUrl?: string) => number
  updateDoc: (id: number, field: keyof Doc, val: string | number[]) => void
  toggleDocJob: (docId: number, jobId: number, checked: boolean) => void
  deleteDoc: (id: number) => void

  jumpToDoc: (id: number) => void
}

export const STATUSES_LIST = STATUSES

export const useStore = create<StoreState>((set, get) => ({
  jobs: loadJobs(),
  docs: loadDocs(),
  tab: 'jobs',
  expandedJob: null,
  expandedDoc: null,
  jobSearch: '',
  jobStatusFilter: '',
  docSearch: '',
  docTypeFilter: '',

  setTab: (tab) => set({ tab }),
  setExpandedJob: (id) => set({ expandedJob: id }),
  setExpandedDoc: (id) => set({ expandedDoc: id }),
  setJobSearch: (q) => set({ jobSearch: q }),
  setJobStatusFilter: (s) => set({ jobStatusFilter: s }),
  setDocSearch: (q) => set({ docSearch: q }),
  setDocTypeFilter: (t) => set({ docTypeFilter: t }),

  addJob: (company, role, status, applied, notes) => {
    const id = Date.now()
    const jobs = [{ id, company, role, status, applied, interview: '', followup: '', notes }, ...get().jobs]
    set({ jobs, expandedJob: id })
    try { localStorage.setItem('jobs_v2', JSON.stringify(jobs)) } catch { /* */ }
    return id
  },

  updateJob: (id, field, val) => {
    const jobs = get().jobs.map(j => j.id === id ? { ...j, [field]: val } : j)
    set({ jobs })
    try { localStorage.setItem('jobs_v2', JSON.stringify(jobs)) } catch { /* */ }
  },

  deleteJob: (id) => {
    const jobs = get().jobs.filter(j => j.id !== id)
    const docs = get().docs.map(d => ({ ...d, linkedJobs: d.linkedJobs.filter(x => x !== id) }))
    set({ jobs, docs, expandedJob: get().expandedJob === id ? null : get().expandedJob })
    try { localStorage.setItem('jobs_v2', JSON.stringify(jobs)) } catch { /* */ }
    try { localStorage.setItem('docs_v1', JSON.stringify(docs)) } catch { /* */ }
  },

  addDoc: (type, name, content, linkedJobs, fileName, fileUrl) => {
    const id = Date.now()
    const docs = [{ id, type, name, content, linkedJobs, updated: today(), fileName, fileUrl }, ...get().docs]
    set({ docs, expandedDoc: id, tab: 'docs' })
    try { localStorage.setItem('docs_v1', JSON.stringify(docs)) } catch { /* */ }
    return id
  },

  updateDoc: (id, field, val) => {
    const docs = get().docs.map(d => {
      if (d.id !== id) return d
      const updated = field === 'content' ? today() : d.updated
      return { ...d, [field]: val, updated }
    })
    set({ docs })
    try { localStorage.setItem('docs_v1', JSON.stringify(docs)) } catch { /* */ }
  },

  toggleDocJob: (docId, jobId, checked) => {
    const docs = get().docs.map(d => {
      if (d.id !== docId) return d
      const linkedJobs = checked
        ? [...new Set([...d.linkedJobs, jobId])]
        : d.linkedJobs.filter(x => x !== jobId)
      return { ...d, linkedJobs }
    })
    set({ docs })
    try { localStorage.setItem('docs_v1', JSON.stringify(docs)) } catch { /* */ }
  },

  deleteDoc: (id) => {
    const docs = get().docs.filter(d => d.id !== id)
    set({ docs, expandedDoc: get().expandedDoc === id ? null : get().expandedDoc })
    try { localStorage.setItem('docs_v1', JSON.stringify(docs)) } catch { /* */ }
  },

  jumpToDoc: (id) => {
    set({ tab: 'docs', expandedDoc: id })
    setTimeout(() => {
      document.getElementById(`dcard-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  },
}))
