import { useShallow } from 'zustand/react/shallow'
import { useStore, STATUSES_LIST } from '../store/useStore'
import { fmtDate, isOverdue } from '../utils/dates'
import { STATUS_CLASS, initials } from '../utils/status'
import type { Job } from '../types'

interface Props { job: Job }

export function JobCard({ job }: Props) {
  const { expandedJob, setExpandedJob, updateJob, deleteJob, jumpToDoc, docs } = useStore(useShallow(s => ({
    expandedJob: s.expandedJob,
    setExpandedJob: s.setExpandedJob,
    updateJob: s.updateJob,
    deleteJob: s.deleteJob,
    jumpToDoc: s.jumpToDoc,
    docs: s.docs,
  })))

  const isExp = expandedJob === job.id
  const overdue = isOverdue(job.followup) && !['Rejected', 'Ghosted', 'Offer'].includes(job.status)
  const linkedDocs = docs.filter(d => d.linkedJobs?.includes(job.id))

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedJob(isExp ? null : job.id)
  }

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  return (
    <div className={`job-card${isExp ? ' expanded' : ''}`} id={`jcard-${job.id}`} onClick={toggle}>
      <div className="job-header">
        <div className="job-icon">{initials(job.company)}</div>
        <div className="job-meta">
          <div className="job-company">{job.company}</div>
          <div className="job-role">{job.role}</div>
        </div>
        <div className="job-right">
          <span className={`badge ${STATUS_CLASS[job.status]}`}>{job.status}</span>
          {job.applied && <span className="job-date">Applied {fmtDate(job.applied)}</span>}
        </div>
      </div>

      {isExp && (
        <div className="expand-section" onClick={stop}>
          <div className="field-row">
            <div className="field">
              <label>Company</label>
              <input type="text" defaultValue={job.company} onChange={e => updateJob(job.id, 'company', e.target.value)} />
            </div>
            <div className="field">
              <label>Role</label>
              <input type="text" defaultValue={job.role} onChange={e => updateJob(job.id, 'role', e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Status</label>
              <select defaultValue={job.status} onChange={e => updateJob(job.id, 'status', e.target.value)}>
                {STATUSES_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Applied</label>
              <input type="date" defaultValue={job.applied} onChange={e => updateJob(job.id, 'applied', e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Interview date</label>
              <input type="date" defaultValue={job.interview} onChange={e => updateJob(job.id, 'interview', e.target.value)} />
            </div>
            <div className="field">
              <label style={overdue ? { color: 'var(--color-text-warning)' } : undefined}>
                Follow-up{overdue ? ' ⚠' : ''}
              </label>
              <input
                type="date"
                defaultValue={job.followup}
                onChange={e => updateJob(job.id, 'followup', e.target.value)}
                style={overdue ? { borderColor: 'var(--color-border-warning)' } : undefined}
              />
            </div>
          </div>
          {job.interview && (
            <div className="reminder-row">
              <i className="ti ti-calendar-event" aria-hidden="true" />
              <span className="reminder-text">Interview scheduled</span>
              <span className="reminder-due">{fmtDate(job.interview)}</span>
            </div>
          )}
          <div className="field">
            <label>Notes</label>
            <textarea defaultValue={job.notes} onChange={e => updateJob(job.id, 'notes', e.target.value)} />
          </div>
          {linkedDocs.length > 0 && (
            <div>
              <div className="section-divider" style={{ marginBottom: 6 }}>Linked documents</div>
              <div className="linked-jobs">
                {linkedDocs.map(d => (
                  <button key={d.id} className="link-chip" onClick={e => { e.stopPropagation(); jumpToDoc(d.id) }}>
                    <i className={`ti ti-${d.type === 'resume' ? 'file-text' : 'mail'}`} aria-hidden="true" style={{ fontSize: 13 }} />
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="btn-row">
            <button className="btn-ghost" onClick={e => { e.stopPropagation(); deleteJob(job.id) }}>
              <i className="ti ti-trash" aria-hidden="true" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
