import { useRef, useState } from 'react'
import { useStore, STATUSES_LIST } from '../store/useStore'
import { today } from '../utils/dates'
import type { Status } from '../types'

interface Props { onClose: () => void }

export function JobModal({ onClose }: Props) {
  const addJob = useStore(s => s.addJob)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<Status>('Applied')
  const [applied, setApplied] = useState(today())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  async function save() {
    if (!company.trim() || !role.trim() || saving) return
    setSaving(true)
    await addJob(company.trim(), role.trim(), status, applied, notes)
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose() }}>
      <div className="modal">
        <h2>Add application</h2>
        <div className="field">
          <label>Company *</label>
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
        </div>
        <div className="field">
          <label>Role *</label>
          <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Engineer" />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Status)}>
              {STATUSES_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Applied date</label>
            <input type="date" value={applied} onChange={e => setApplied(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Salary, recruiter name, job link…" style={{ minHeight: 60 }} />
        </div>
        <div className="btn-row">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Adding…' : 'Add application'}
          </button>
        </div>
      </div>
    </div>
  )
}
