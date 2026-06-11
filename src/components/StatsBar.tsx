import { useStore } from '../store/useStore'
import { today } from '../utils/dates'

export function StatsBar() {
  const jobs = useStore(s => s.jobs)
  const active = jobs.filter(j => !['Rejected', 'Ghosted'].includes(j.status)).length
  const offers = jobs.filter(j => j.status === 'Offer').length
  const due = jobs.filter(j =>
    j.followup && j.followup <= today() && !['Rejected', 'Ghosted', 'Offer'].includes(j.status)
  ).length

  return (
    <div className="stats">
      <div className="stat"><div className="stat-label">Total</div><div className="stat-val">{jobs.length}</div></div>
      <div className="stat"><div className="stat-label">Active</div><div className="stat-val">{active}</div></div>
      <div className="stat"><div className="stat-label">Offers</div><div className="stat-val">{offers}</div></div>
      <div className="stat">
        <div className="stat-label">Follow-ups due</div>
        <div className="stat-val" style={{ color: due > 0 ? 'var(--color-text-warning)' : undefined }}>{due}</div>
      </div>
    </div>
  )
}
