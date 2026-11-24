import { Navigate, Outlet } from 'react-router-dom'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import { getNexionRole } from '../../services/googleAdsApi.js'
import { useGoogleAdsAccount } from '../../context/GoogleAdsAccountContext.jsx'

export default function GoogleAdsLayout() {
  const { isConnected, isMockMode, isLoading, connectionErrorStatus, error } = useGoogleAds()
  const scope = useGoogleAdsAccount()
  const isSuperAdmin = getNexionRole() === 'superadmin'

  if (connectionErrorStatus === 401) return <Navigate to="/login" replace />
  if (isLoading) return <p role="status">Checking Google Ads access...</p>
  if (!isConnected && !isSuperAdmin) return <Navigate to="/google-ads/connect" replace />

  return (
    <main className="ads-page">
      <div className="ads-content">
        {!isSuperAdmin && <div className="ads-card mb-5 px-4 py-3">
          <div className="grid min-w-0 items-center gap-1.5 text-sm font-medium text-slate-700 sm:grid-cols-[auto_minmax(0,30rem)] sm:gap-3"><span>Google Ads account</span><div className="ads-control grid min-w-0 items-center gap-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]" role="status" aria-label="Assigned Google Ads account">{scope.loading ? <span className="text-slate-500">Loading assigned account…</span> : scope.selected ? <><span className="min-w-0 truncate">{scope.selected.name || 'Assigned Google Ads account'}</span><span className="font-mono text-xs text-slate-600">{scope.selected.id}</span><span className="text-xs text-slate-600">{scope.selected.currency || '—'}</span></> : <span className="text-slate-500">No assigned Google Ads account</span>}</div></div>
        </div>}
        {error && <p role="alert">{error}</p>}
        {!isSuperAdmin && scope.errors.map((message, index) => <p role="alert" key={index}>{message}</p>)}
        {isMockMode && !isSuperAdmin && (
          <div role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Google Ads Development Mode:</strong> using demo account and campaign data. No Google connection or OAuth is required.
          </div>
        )}
        <Outlet />
      </div>
    </main>
  )
}
