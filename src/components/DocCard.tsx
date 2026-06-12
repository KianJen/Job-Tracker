import { useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store/useStore'
import { fmtDate } from '../utils/dates'
import { STATUS_CLASS } from '../utils/status'
import type { Doc } from '../types'

interface Props { doc: Doc }

export function DocCard({ doc }: Props) {
  const { expandedDoc, setExpandedDoc, updateDoc, uploadDocFile, removeDocFile, toggleDocJob, deleteDoc, jobs } = useStore(useShallow(s => ({
    expandedDoc: s.expandedDoc,
    setExpandedDoc: s.setExpandedDoc,
    updateDoc: s.updateDoc,
    uploadDocFile: s.uploadDocFile,
    removeDocFile: s.removeDocFile,
    toggleDocJob: s.toggleDocJob,
    deleteDoc: s.deleteDoc,
    jobs: s.jobs,
  })))

  const isExp = expandedDoc === doc.id
  const isResume = doc.type === 'resume'
  const linked = jobs.filter(j => doc.linkedJobs?.includes(j.id))
  const preview = doc.content ? doc.content.slice(0, 120).replace(/\n/g, ' ') + '…' : 'No content yet.'

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!picked) return
    setUploading(true)
    await uploadDocFile(doc.id, picked)
    setUploading(false)
  }

  return (
    <div className={`doc-card${isExp ? ' expanded' : ''}`} id={`dcard-${doc.id}`}>
      <div className="doc-card-header" onClick={() => setExpandedDoc(isExp ? null : doc.id)}>
        <div className={`doc-icon ${isResume ? 'doc-icon-resume' : 'doc-icon-cover'}`}>
          <i className={`ti ti-${isResume ? 'file-text' : 'mail'}`} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span className="doc-name">{doc.name}</span>
            <span className={`badge ${isResume ? 'doc-badge-resume' : 'doc-badge-cover'}`}>
              {isResume ? 'Resume' : 'Cover letter'}
            </span>
          </div>
          {!isExp && <div className="doc-meta">{preview}</div>}
        </div>
        {doc.fileUrl && (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noreferrer"
            title={doc.fileName ?? 'Open file'}
            onClick={e => e.stopPropagation()}
            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-info)', flexShrink: 0, marginLeft: 8 }}
          >
            <i className="ti ti-paperclip" aria-hidden="true" style={{ fontSize: 16 }} />
          </a>
        )}
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0, marginLeft: 8 }}>
          {doc.updated ? fmtDate(doc.updated) : ''}
        </div>
      </div>

      {isExp && (
        <div className="doc-expand">
          <div className="field-row">
            <div className="field">
              <label>Type</label>
              <select defaultValue={doc.type} onChange={e => updateDoc(doc.id, 'type', e.target.value)}>
                <option value="resume">Resume</option>
                <option value="cover">Cover letter</option>
              </select>
            </div>
            <div className="field">
              <label>Version / label</label>
              <input type="text" defaultValue={doc.name} onChange={e => updateDoc(doc.id, 'name', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Attached file (PDF or DOCX)</label>
            {doc.fileUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-info)', textDecoration: 'none', padding: '7px 10px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', flex: 1, minWidth: 0 }}
                >
                  <i className="ti ti-paperclip" aria-hidden="true" style={{ fontSize: 14, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName ?? 'Open file'}</span>
                  <i className="ti ti-external-link" aria-hidden="true" style={{ fontSize: 12, opacity: 0.6, marginLeft: 'auto', flexShrink: 0 }} />
                </a>
                <button className="btn-outline" type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? 'Uploading…' : 'Replace'}
                </button>
                <button className="btn-ghost" type="button" onClick={() => removeDocFile(doc.id)}>Remove</button>
              </div>
            ) : (
              <button className="btn-outline" type="button" style={{ alignSelf: 'flex-start' }} disabled={uploading} onClick={() => fileRef.current?.click()}>
                <i className="ti ti-upload" aria-hidden="true" />
                {uploading ? 'Uploading…' : 'Attach PDF or DOCX'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: 'none' }}
              onChange={onFilePicked}
            />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              className="doc-edit-area"
              defaultValue={doc.content}
              onChange={e => updateDoc(doc.id, 'content', e.target.value)}
            />
          </div>
          <div>
            <div className="section-divider" style={{ marginBottom: 6 }}>Link to applications</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 130, overflowY: 'auto' }}>
              {jobs.length === 0
                ? <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No applications yet.</span>
                : jobs.map(j => (
                  <label key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      defaultChecked={doc.linkedJobs?.includes(j.id)}
                      onChange={e => toggleDocJob(doc.id, j.id, e.target.checked)}
                    />
                    <span>{j.company} — {j.role}</span>
                    <span className={`badge ${STATUS_CLASS[j.status]}`} style={{ marginLeft: 'auto' }}>{j.status}</span>
                  </label>
                ))
              }
            </div>
          </div>
          {linked.length > 0 && (
            <div>
              <div className="section-divider" style={{ marginBottom: 6 }}>Linked to</div>
              <div className="linked-jobs">
                {linked.map(j => (
                  <span key={j.id} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>
                    {j.company} — {j.role}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="btn-row">
            <button className="btn-ghost" onClick={() => deleteDoc(doc.id)}>
              <i className="ti ti-trash" aria-hidden="true" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
