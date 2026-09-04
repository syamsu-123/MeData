import { Clock3, LogOut } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const LOCALE_MAP = { id: 'id-ID', en: 'en-US', ar: 'ar-SA', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' }

export default function VisitTable({ visits, activeOnly = false, onCheckOut }) {
  const { t, lang } = useLanguage()
  const locale = LOCALE_MAP[lang] || 'id-ID'

  const fmt = (value) =>
    value
      ? new Date(value).toLocaleString(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : t('common.dash')

  const dur = (minutes) => {
    if (minutes == null) return t('common.dash')
    if (minutes === 0) return t('visitTable.lessThanMinute')
    const hours = Math.floor(minutes / 60)
    const rem = minutes % 60
    if (hours > 0) {
      if (lang === 'en') return `${hours}h ${rem}m`
      return `${hours} ${t('visitTable.hours')} ${rem} ${t('visitTable.minutes')}`
    }
    return `${rem} ${t('visitTable.minutes')}`
  }

  const items = activeOnly ? visits.filter((v) => v.status === 'ACTIVE') : visits

  if (!items.length) {
    return (
      <div className="empty-state">
        <Clock3 size={28} />
        <strong>{activeOnly ? t('visitTable.noActiveStudents') : t('visitTable.noHistory')}</strong>
        <span>{t('visitTable.emptyDesc')}</span>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('visitTable.colStudent')}</th>
            <th>{t('visitTable.colClass')}</th>
            <th>{t('visitTable.colLocation')}</th>
            <th>{t('visitTable.colCheckin')}</th>
            <th>{t('visitTable.colCheckout')}</th>
            <th>{t('visitTable.colDuration')}</th>
            <th>{t('visitTable.colNotes')}</th>
            <th>{t('visitTable.colStatus')}</th>
            {onCheckOut && <th />}
          </tr>
        </thead>
        <tbody>
          {items.map((visit) => (
            <tr key={visit.id}>
              <td>
                <strong>{visit.studentName}</strong>
                <small>{visit.nis || t('common.dash')}</small>
              </td>
              <td>{visit.studentClass || t('common.dash')}</td>
              <td>
                <span className="location-pill">{visit.locationId?.toUpperCase()}</span>
              </td>
              <td>{fmt(visit.checkIn)}</td>
              <td>{fmt(visit.checkOut)}</td>
              <td>{dur(visit.duration)}</td>
              <td>{visit.notes ? <span>{visit.notes}</span> : <small className="muted">{t('common.dash')}</small>}</td>
              <td>
                <span
                  className={`badge ${
                    visit.status === 'ACTIVE' ? 'badge-active' : 'badge-complete'
                  }`}
                >
                  {visit.status === 'ACTIVE' ? t('common.active') : t('common.completed')}
                </span>
              </td>
              {onCheckOut && (
                <td>
                  <button className="btn-small" onClick={() => onCheckOut(visit)}>
                    <LogOut size={14} /> {t('visitTable.checkoutBtn')}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
