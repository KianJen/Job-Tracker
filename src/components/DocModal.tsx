import { useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store/useStore'
import { STATUS_CLASS } from '../utils/status'

interface Props { onClose: () => void }

export function DocModal({ onClose }: Props) {
  const { addDoc, uploadDocFile, jobs } = useStore(useShallow(s => ({ addDoc: s.addDoc, uploadDocFile: s.uploadDocFile, jobs: s.jobs })))
  const [type, setType] = useState<'resume' | 'cover'>('resume')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [linked, setLinked] = useState<number[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function toggleJob(id: number, checked: boolean) {
    setLinked(prev => checked ? [...prev, id] : prev.filter(x => x !== id))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    setFile(picked)
    if (!name.trim()) setName(picked.name.replace(/\.(pdf|docx)$/i, ''))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function save() {
    if (!name.trim() || saving) return
    setSaving(true)
    const id = await addDoc(type, name.trim(), content, linked)
    if (id != null && file) {
      await uploadDocFile(id, file)
    }
    setSaving(false)
    if (id != null) onClose()
  }

  const contentLabel = type === 'resume' ? 'Resume content' : 'Cover letter content'

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose() }}>
      <div className="modal">
        <h2>Add document</h2>
        <div className="field-row">
          <div className="field">
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value as 'resume' | 'cover')}>
              <option value="resume">Resume</option>
              <option value="cover">Cover letter</option>
            </select>
          </div>
          <div className="field">
            <label>Version / label</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. v3 — tech roles" />
          </div>
        </div>
        <div className="field">
          <label>Attach file (PDF or DOCX)</label>
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)' }}>
              <i className="ti ti-paperclip" aria-hidden="true" style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }} />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', flex: 1 }}>{file.name}</span>
              <button
                type="button"
                style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 0 }}
                onClick={() => setFile(null)}
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              className="btn-outline"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <i className="ti ti-upload" aria-hidden="true" />
              Upload PDF or DOCX
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </div>
        <div className="field">
          <label>Link to applications (optional)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 110, overflowY: 'auto', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '8px 10px' }}>
            {jobs.length === 0
              ? <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No applications yet.</span>
              : jobs.map(j => (
                <label key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={linked.includes(j.id)} onChange={e => toggleJob(j.id, e.target.checked)} />
                  <span>{j.company} — {j.role}</span>
                  <span className={`badge ${STATUS_CLASS[j.status]}`} style={{ marginLeft: 'auto' }}>{j.status}</span>
                </label>
              ))
            }
          </div>
        </div>
        <div className="field">
          <label>{contentLabel} (optional)</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ minHeight: 100 }}
            placeholder="Add notes or paste text here…"
          />
        </div>
        <div className="btn-row">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save document'}
          </button>
        </div>
      </div>
    </div>
  )
}
