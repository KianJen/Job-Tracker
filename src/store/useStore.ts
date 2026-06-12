import { create } from 'zustand'
import type { Job, Doc, Status } from '../types'
import { today } from '../utils/dates'
import { api } from '../api/client'

const STATUSES: Status[] = [
  'Phone screen', 'Technical Interview', 'Final Interview',
  'Offer', 'Rejected', 'Ghosted',
]

// Debounce network writes for fields edited keystroke-by-keystroke.
const timers: Record<string, ReturnType<typeof setTimeout>> = {}
function debounce(key: string, fn: () => void, ms = 500) {
  clearTimeout(timers[key])
  timers[key] = setTimeout(fn, ms)
}

interface StoreState {
  jobs: Job[]
  docs: Doc[]
  loading: boolean
  error: string | null
  tab: 'jobs' | 'docs'
  expandedJob: number | null
  expandedDoc: number | null
  jobSearch: string
  jobStatusFilter: string
  docSearch: string
  docTypeFilter: string

  load: () => Promise<void>
  setError: (msg: string | null) => void

  setTab: (tab: 'jobs' | 'docs') => void
  setExpandedJob: (id: number | null) => void
  setExpandedDoc: (id: number | null) => void
  setJobSearch: (q: string) => void
  setJobStatusFilter: (s: string) => void
  setDocSearch: (q: string) => void
  setDocTypeFilter: (t: string) => void

  addJob: (company: string, role: string, status: Status, applied: string, notes: string) => Promise<void>
  updateJob: (id: number, field: keyof Job, val: string) => void
  deleteJob: (id: number) => Promise<void>

  addDoc: (type: 'resume' | 'cover', name: string, content: string, linkedJobs: number[]) => Promise<number | null>
  updateDoc: (id: number, field: keyof Doc, val: string) => void
  uploadDocFile: (id: number, file: File) => Promise<void>
  toggleDocJob: (docId: number, jobId: number, checked: boolean) => void
  deleteDoc: (id: number) => Promise<void>

  jumpToDoc: (id: number) => void
}

export const STATUSES_LIST = STATUSES

export const useStore = create<StoreState>((set, get) => ({
  jobs: [],
  docs: [],
  loading: true,
  error: null,
  tab: 'jobs',
  expandedJob: null,
  expandedDoc: null,
  jobSearch: '',
  jobStatusFilter: '',
  docSearch: '',
  docTypeFilter: '',

  load: async () => {
    set({ loading: true, error: null })
    try {
      const [jobs, docs] = await Promise.all([api.listJobs(), api.listDocs()])
      set({ jobs, docs, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load data' })
    }
  },

  setError: (msg) => set({ error: msg }),

  setTab: (tab) => set({ tab }),
  setExpandedJob: (id) => set({ expandedJob: id }),
  setExpandedDoc: (id) => set({ expandedDoc: id }),
  setJobSearch: (q) => set({ jobSearch: q }),
  setJobStatusFilter: (s) => set({ jobStatusFilter: s }),
  setDocSearch: (q) => set({ docSearch: q }),
  setDocTypeFilter: (t) => set({ docTypeFilter: t }),

  addJob: async (company, role, status, applied, notes) => {
    try {
      const job = await api.createJob({ company, role, status, applied, notes })
      set({ jobs: [job, ...get().jobs], expandedJob: job.id })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to add job' })
    }
  },

  updateJob: (id, field, val) => {
    // Optimistic local update for a responsive UI.
    set({ jobs: get().jobs.map(j => j.id === id ? { ...j, [field]: val } : j) })
    debounce(`job:${id}:${field}`, () => {
      api.updateJob(id, { [field]: val }).catch(e =>
        set({ error: e instanceof Error ? e.message : 'Failed to save changes' })
      )
    })
  },

  deleteJob: async (id) => {
    try {
      await api.deleteJob(id)
      set({
        jobs: get().jobs.filter(j => j.id !== id),
        // Backend cascades the link removal; mirror that locally.
        docs: get().docs.map(d => ({ ...d, linkedJobs: d.linkedJobs.filter(x => x !== id) })),
        expandedJob: get().expandedJob === id ? null : get().expandedJob,
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete job' })
    }
  },

  addDoc: async (type, name, content, linkedJobs) => {
    try {
      const doc = await api.createDoc({ type, name, content, linkedJobs })
      set({ docs: [doc, ...get().docs], expandedDoc: doc.id, tab: 'docs' })
      return doc.id
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to add document' })
      return null
    }
  },

  updateDoc: (id, field, val) => {
    set({
      docs: get().docs.map(d =>
        d.id === id ? { ...d, [field]: val, updated: today() } : d
      ),
    })
    debounce(`doc:${id}:${field}`, () => {
      api.updateDoc(id, { [field]: val }).catch(e =>
        set({ error: e instanceof Error ? e.message : 'Failed to save changes' })
      )
    })
  },

  uploadDocFile: async (id, file) => {
    try {
      const updated = await api.uploadDocFile(id, file)
      set({ docs: get().docs.map(d => d.id === id ? updated : d) })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to upload file' })
    }
  },

  toggleDocJob: (docId, jobId, checked) => {
    const doc = get().docs.find(d => d.id === docId)
    if (!doc) return
    const linkedJobs = checked
      ? [...new Set([...doc.linkedJobs, jobId])]
      : doc.linkedJobs.filter(x => x !== jobId)
    set({ docs: get().docs.map(d => d.id === docId ? { ...d, linkedJobs } : d) })
    api.updateDoc(docId, { linkedJobs }).catch(e =>
      set({ error: e instanceof Error ? e.message : 'Failed to update links' })
    )
  },

  deleteDoc: async (id) => {
    try {
      await api.deleteDoc(id)
      set({
        docs: get().docs.filter(d => d.id !== id),
        expandedDoc: get().expandedDoc === id ? null : get().expandedDoc,
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete document' })
    }
  },

  jumpToDoc: (id) => {
    set({ tab: 'docs', expandedDoc: id })
    setTimeout(() => {
      document.getElementById(`dcard-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  },
}))
