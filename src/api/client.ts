import type { Job, Doc, Status } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch { /* non-JSON error body */ }
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface JobInput {
  company: string
  role: string
  status: Status
  applied: string
  interview?: string
  followup?: string
  notes: string
}

export interface DocInput {
  type: 'resume' | 'cover'
  name: string
  content: string
  linkedJobs: number[]
}

export const api = {
  listJobs: () => req<Job[]>('/jobs'),
  createJob: (data: JobInput) => req<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  updateJob: (id: number, data: Partial<Job>) =>
    req<Job>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteJob: (id: number) => req<void>(`/jobs/${id}`, { method: 'DELETE' }),

  listDocs: () => req<Doc[]>('/documents'),
  createDoc: (data: DocInput) => req<Doc>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  updateDoc: (id: number, data: Partial<DocInput>) =>
    req<Doc>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDoc: (id: number) => req<void>(`/documents/${id}`, { method: 'DELETE' }),

  uploadDocFile: async (id: number, file: File): Promise<Doc> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/api/documents/${id}/file`, { method: 'POST', body: form })
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`
      try {
        const body = await res.json()
        if (body?.detail) detail = body.detail
      } catch { /* */ }
      throw new Error(detail)
    }
    return res.json() as Promise<Doc>
  },
  deleteDocFile: (id: number) => req<Doc>(`/documents/${id}/file`, { method: 'DELETE' }),
}
