import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore, STATUSES_LIST } from './store/useStore'
import { StatsBar } from './components/StatsBar'
import { JobCard } from './components/JobCard'
import { DocCard } from './components/DocCard'
import { JobModal } from './components/JobModal'
import { DocModal } from './components/DocModal'

export default function App() {
  const { tab, setTab, jobs, docs, jobSearch, setJobSearch, jobStatusFilter, setJobStatusFilter, docSearch, setDocSearch, docTypeFilter, setDocTypeFilter } = useStore(useShallow(s => ({
    tab: s.tab,
    setTab: s.setTab,
    jobs: s.jobs,
    docs: s.docs,
    jobSearch: s.jobSearch,
    setJobSearch: s.setJobSearch,
    jobStatusFilter: s.jobStatusFilter,
    setJobStatusFilter: s.setJobStatusFilter,
    docSearch: s.docSearch,
    setDocSearch: s.setDocSearch,
    docTypeFilter: s.docTypeFilter,
    setDocTypeFilter: s.setDocTypeFilter,
  })))

  const [showJobModal, setShowJobModal] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)

  const filteredJobs = jobs.filter(j =>
    (!jobSearch || (j.company + j.role).toLowerCase().includes(jobSearch.toLowerCase())) &&
    (!jobStatusFilter || j.status === jobStatusFilter)
  )

  const filteredDocs = docs.filter(d =>
    (!docSearch || d.name.toLowerCase().includes(docSearch.toLowerCase()) || d.content.toLowerCase().includes(docSearch.toLowerCase())) &&
    (!docTypeFilter || d.type === docTypeFilter)
  )

  return (
    <>
      <h2 className="sr-only">Job tracker — manage applications, cover letters, and resumes</h2>

      <nav className="nav">
        <button className={`nav-tab${tab === 'jobs' ? ' active' : ''}`} onClick={() => setTab('jobs')}>
          <i className="ti ti-briefcase" aria-hidden="true" style={{ fontSize: 14, marginRight: 5, verticalAlign: -1 }} />
          Applications
        </button>
        <button className={`nav-tab${tab === 'docs' ? ' active' : ''}`} onClick={() => setTab('docs')}>
          <i className="ti ti-files" aria-hidden="true" style={{ fontSize: 14, marginRight: 5, verticalAlign: -1 }} />
          Documents
        </button>
      </nav>

      {tab === 'jobs' && (
        <div>
          <div className="toolbar">
            <span style={{ flex: 1 }} />
            <div className="search-wrap">
              <i className="ti ti-search" aria-hidden="true" />
              <input className="search-input" type="text" placeholder="Search roles or companies…" value={jobSearch} onChange={e => setJobSearch(e.target.value)} />
            </div>
            <select value={jobStatusFilter} onChange={e => setJobStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn-outline" onClick={() => setShowJobModal(true)}>
              <i className="ti ti-plus" aria-hidden="true" />Add job
            </button>
          </div>
          <StatsBar />
          <div className="jobs-list">
            {filteredJobs.length === 0
              ? <div className="empty"><i className="ti ti-inbox" aria-hidden="true" />No applications found</div>
              : filteredJobs.map(j => <JobCard key={j.id} job={j} />)
            }
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div>
          <div className="toolbar">
            <span style={{ flex: 1 }} />
            <div className="search-wrap">
              <i className="ti ti-search" aria-hidden="true" />
              <input className="search-input" type="text" placeholder="Search documents…" value={docSearch} onChange={e => setDocSearch(e.target.value)} />
            </div>
            <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="resume">Resume</option>
              <option value="cover">Cover letter</option>
            </select>
            <button className="btn-outline" onClick={() => setShowDocModal(true)}>
              <i className="ti ti-plus" aria-hidden="true" />Add document
            </button>
          </div>
          <div className="docs-list">
            {filteredDocs.length === 0
              ? <div className="empty"><i className="ti ti-files" aria-hidden="true" />No documents yet</div>
              : filteredDocs.map(d => <DocCard key={d.id} doc={d} />)
            }
          </div>
        </div>
      )}

      {showJobModal && <JobModal onClose={() => setShowJobModal(false)} />}
      {showDocModal && <DocModal onClose={() => setShowDocModal(false)} />}
    </>
  )
}
