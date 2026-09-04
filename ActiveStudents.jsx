import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocationContext } from '../context/LocationContext'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import { checkOut, subscribeVisits } from '../services/firestoreService'
import VisitTable from '../components/common/VisitTable'

const LOCALE_MAP = { id: 'id-ID', en: 'en-US', ar: 'ar-SA', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' }

export default function ActiveStudents() {
  const { activeLocation } = useLocationContext()
  const { user, isViewer } = useAuth()
  const { showToast } = useToast()
  const { t, lang } = useLanguage()
  const [visits, setVisits] = useState([])
  const [error, setError] = useState('')
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const locale = LOCALE_MAP[lang] || 'id-ID'

  useEffect(() => subscribeVisits(activeLocation, setVisits, setError), [activeLocation])

  const done = async () => {
    if (isViewer) {
      showToast(t('active.viewerCheckoutError'), 'error')
      setTarget(null)
      return
    }
    setBusy(true)
    try {
      await checkOut(target, user.uid)
      showToast(t('active.checkoutSuccess'))
      setTarget(null)
    } catch {
      showToast(t('active.checkoutFailed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t('active.eyebrow')} {activeLocation.toUpperCase()}</span>
          <h2>{t('active.title')}</h2>
          <p>{t('active.desc')}</p>
        </div>
      </div>

      {isViewer && (
        <div className="alert warning" style={{ marginBottom: '16px' }}>
          <span dangerouslySetInnerHTML={{ __html: t('viewer.activeStudents') }} />
        </div>
      )}

      {error && <div className="alert error">{error}</div>}

      <VisitTable visits={visits} activeOnly onCheckOut={isViewer ? null : setTarget} />

      {target && !isViewer && (
        <div className="modal-backdrop">
          <div className="dialog">
            <h3>{t('active.confirmCheckout')}</h3>
            <p>
              {t('active.confirmCheckoutMsg')} <strong>{target.studentName}</strong>?
            </p>
            <small>
              {t('active.checkinTime')}{' '}
              {new Date(target.checkIn).toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTarget(null)}
                disabled={busy}
              >
                {t('common.cancel')}
              </button>
              <button type="button" className="btn-primary" onClick={done} disabled={busy}>
                {busy ? t('common.processing') : t('active.checkoutBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
