import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import GoogleAdsLayout from './components/google-ads/GoogleAdsLayout.jsx'
import { GoogleAdsProvider } from './context/GoogleAdsContext.jsx'
import AdGroups from './pages/google-ads/AdGroups.jsx'
import Ads from './pages/google-ads/Ads.jsx'
import Assets from './pages/google-ads/Assets.jsx'
import Billing from './pages/google-ads/Billing.jsx'
import Budgets from './pages/google-ads/Budgets.jsx'
import Campaigns from './pages/google-ads/Campaigns.jsx'
import Clients, { ClientDetails } from './pages/google-ads/Clients.jsx'
import Connect from './pages/google-ads/Connect.jsx'
import Connected from './pages/google-ads/Connected.jsx'
import Dashboard from './pages/google-ads/Dashboard.jsx'
import Keywords from './pages/google-ads/Keywords.jsx'
import Reports from './pages/google-ads/Reports.jsx'
import Settings from './pages/google-ads/Settings.jsx'
import GoogleAdsLeadsPage from './pages/google-ads/GoogleAdsLeadsPage.jsx'
import { getNexionRole, getNexionSession } from './services/googleAdsApi.js'
import { GoogleAdsAccountProvider } from './context/GoogleAdsAccountContext.jsx'

export function CustomerCampaignPage({ children }) {
  return getNexionSession() ? children : <Navigate to="/login" replace />
}

function ClientGoogleAdsPage({ children }) {
  return getNexionRole() === 'superadmin' ? <Navigate to="/google-ads" replace /> : children
}

function GoogleAdsRouteBridge() {
  useEffect(() => {
    const parentOrigin = import.meta.env.VITE_NEXION_PARENT_ORIGIN || ''
    if (!parentOrigin || window.parent === window) return undefined
    const handleRoute = (event) => {
      if (event.origin !== parentOrigin || event.source !== window.parent) return
      if (event.data?.type !== 'nexion-google-ads-route') return
      const path = typeof event.data.path === 'string' ? event.data.path : ''
      if (!path.startsWith('/google-ads')) return
      const nextUrl = `${path}${event.data.search || ''}${event.data.hash || ''}`
      if (`${window.location.pathname}${window.location.search}${window.location.hash}` === nextUrl) return
      window.history.pushState({}, '', nextUrl)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    window.addEventListener('message', handleRoute)
    return () => window.removeEventListener('message', handleRoute)
  }, [])
  return null
}

export default function App() {
  const isSuperAdmin = getNexionRole() === 'superadmin'
  const layout = <GoogleAdsAccountProvider><GoogleAdsLayout /></GoogleAdsAccountProvider>
  return (
    <GoogleAdsProvider>
      <GoogleAdsRouteBridge />
      <Routes>
        <Route path="/login" element={<div role="alert" className="p-8">Sign in to NEXION to access Google Ads. <a href={`${import.meta.env.VITE_NEXION_PARENT_ORIGIN || ''}/login`} target="_top">Go to login</a></div>} />
        <Route path="/google-ads/connect" element={<Connect />} />
        <Route path="/google-ads/connected" element={<Connected />} />
        <Route path="/google-ads/callback" element={<Connected />} />
        <Route path="/google-ads/billing" element={<CustomerCampaignPage><ClientGoogleAdsPage><Billing /></ClientGoogleAdsPage></CustomerCampaignPage>} />
        <Route path="/google-ads" element={<CustomerCampaignPage>{layout}</CustomerCampaignPage>}>
          <Route index element={isSuperAdmin ? <Clients /> : <Dashboard />} />
          <Route path="clients" element={isSuperAdmin ? <Clients /> : <Navigate to="/google-ads" replace />} />
          <Route path="clients/:clientId" element={isSuperAdmin ? <ClientDetails /> : <Navigate to="/google-ads" replace />} />
          <Route path="campaigns" element={<ClientGoogleAdsPage><Campaigns /></ClientGoogleAdsPage>} />
          <Route path="ad-groups" element={<ClientGoogleAdsPage><AdGroups /></ClientGoogleAdsPage>} />
          <Route path="ads" element={<ClientGoogleAdsPage><Ads /></ClientGoogleAdsPage>} />
          <Route path="leads" element={<GoogleAdsLeadsPage />} />
          <Route path="keywords" element={<ClientGoogleAdsPage><Keywords /></ClientGoogleAdsPage>} />
          <Route path="assets" element={<ClientGoogleAdsPage><Assets /></ClientGoogleAdsPage>} />
          <Route path="budgets" element={<ClientGoogleAdsPage><Budgets /></ClientGoogleAdsPage>} />
          <Route path="reports" element={<ClientGoogleAdsPage><Reports /></ClientGoogleAdsPage>} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/google-ads" replace />} />
      </Routes>
    </GoogleAdsProvider>
  )
}
