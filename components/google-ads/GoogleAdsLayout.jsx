import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import GoogleAdsSidebar from './GoogleAdsSidebar.jsx'
import ConnectionStatus from './ConnectionStatus.jsx'
import Breadcrumbs from '../common/Breadcrumbs.jsx'

const breadcrumbMap = {
  '/google-ads': [{ label: 'Overview' }],
  '/google-ads/campaigns': [{ label: 'Campaigns' }],
  '/google-ads/ad-groups': [{ label: 'Ad Groups' }],
  '/google-ads/ads': [{ label: 'Ads' }],
  '/google-ads/keywords': [{ label: 'Keywords' }],
  '/google-ads/assets': [{ label: 'Assets' }],
  '/google-ads/budgets': [{ label: 'Budgets' }],
  '/google-ads/reports': [{ label: 'Reports' }],
  '/google-ads/settings': [{ label: 'Settings' }],
}

export default function GoogleAdsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isConnected, isMockMode } = useGoogleAds()

  useEffect(() => {
    if (location.pathname.startsWith('/google-ads')) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  const breadcrumbs = breadcrumbMap[location.pathname] || [{ label: 'Overview' }]

  if (!isConnected) {
    navigate('/google-ads/connect', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex">
      <GoogleAdsSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-margin-mobile bg-surface sticky top-0 z-40 border-b border-surface-variant">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-primary p-2 -ml-2"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary m-0">Google Ads</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-[18px]">ads_click</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-surface">
          <div className="p-margin-mobile md:p-margin-desktop">
            {isMockMode && (
              <div role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <strong>Local demo mode:</strong> showing sample data. Google Ads is not actually connected; OAuth and backend requests are disabled for this development session.
              </div>
            )}
            <div className="flex items-center justify-between mb-stack-lg flex-wrap gap-3">
              <Breadcrumbs items={breadcrumbs} />
              <ConnectionStatus />
            </div>

            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
