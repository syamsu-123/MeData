import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle2, Clock3, Filter, Search } from 'lucide-react'
import { useLocationContext } from '../context/LocationContext'
import { useLanguage } from '../context/LanguageContext'
import { subscribeVisits } from '../services/firestoreService'
import VisitTable from '../components/common/VisitTable'

export default function History() {
  const { activeLocation } = useLocationContext()
  const { t } = useLanguage()
  const [visits, setVisits] = useState([])
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('all') // 'all', 'today', 'week', 'month'
  const [error, setError] = useState('')

  useEffect(() => subscribeVisits(activeLocation, setVisits, setError), [activeLocation])

  const filtered = useMemo(() => {
    const now = new Date()
    const todayStr = now.toDateString()

    return visits.filter((v) => {
      if (v.status !== 'COMPLETED') return false

      const checkInDate = new Date(v.checkIn)
      if (period === 'today') {
        if (checkInDate.toDateString() !== todayStr) return false
      } else if (period === 'week') {
        const diffTime = Math.abs(now - checkInDate)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays > 7) return false
      } else if (period === 'month') {
        const diffTime = Math.abs(now - checkInDate)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays > 30) return false
      }

      if (!query) return true
      const searchTarget = `${v.studentName || ''} ${v.nis || ''} ${v.studentClass || ''} ${v.notes || ''}`.toLowerCase()
      return searchTarget.includes(query.toLowerCase())
    })
  }, [visits, query, period])

  const stats = useMemo(() => {
    const completedVisits = visits.filter((v) => v.status === 'COMPLETED')
    const totalDuration = completedVisits.reduce((acc, curr) => acc + (curr.duration || 0), 0)
    const avgDuration = completedVisits.length ? Math.round(totalDuration / completedVisits.length) : 0
    const todayCount = completedVisits.filter(
      (v) => new Date(v.checkIn).toDateString() === new Date().toDateString(),
    ).length

    return {
      total: completedVisits.length,
      avgDuration: avgDuration > 60 ? `${Math.floor(avgDuration / 60)}h ${avgDuration % 60}m` : `${avgDuration}m`,
      todayCount,
    }
  }, [visits])

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t('history.eyebrow')} {activeLocation.toUpperCase()}</span>
          <h2>{t('history.title')}</h2>
          <p>{t('history.desc')}</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <article className="stat-card">
          <div>
            <span>{t('history.totalCompleted')}</span>
            <strong>{stats.total}</strong>
            <small>{t('history.allHistory')} {activeLocation.toUpperCase()}</small>
          </div>
          <span className="stat-icon">
            <CheckCircle2 size={20} />
          </span>
        </article>
        <article className="stat-card">
          <div>
            <span>{t('history.completedToday')}</span>
            <strong>{stats.todayCount}</strong>
            <small>{t('history.todayService')}</small>
          </div>
          <span className="stat-icon">
            <Calendar size={20} />
          </span>
        </article>
        <article className="stat-card">
          <div>
            <span>{t('history.avgDuration')}</span>
            <strong>{stats.avgDuration}</strong>
            <small>{t('history.durationDesc')}</small>
          </div>
          <span className="stat-icon">
            <Clock3 size={20} />
          </span>
        </article>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div className="search-input" style={{ flex: '1 1 260px' }}>
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={16} className="muted" />
          <select
            className="filter-input"
            style={{ marginBottom: 0, width: 'auto' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">{t('history.allTime')}</option>
            <option value="today">{t('history.today')}</option>
            <option value="week">{t('history.last7Days')}</option>
            <option value="month">{t('history.last30Days')}</option>
          </select>
        </div>
      </div>

      <VisitTable visits={filtered} />
    </section>
  )
}
