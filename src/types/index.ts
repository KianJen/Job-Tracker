export type Status =
  | 'Phone screen'
  | 'Technical Interview'
  | 'Final Interview'
  | 'Offer'
  | 'Rejected'
  | 'Ghosted'

export interface Job {
  id: number
  company: string
  role: string
  status: Status
  applied: string
  interview: string
  followup: string
  notes: string
}

export interface Doc {
  id: number
  type: 'resume' | 'cover'
  name: string
  content: string
  linkedJobs: number[]
  updated: string
  fileName?: string
  fileUrl?: string
}
