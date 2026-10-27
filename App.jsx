import { Navigate, Route, Routes } from 'react-router-dom'
import GoogleAdsLayout from './components/google-ads/GoogleAdsLayout.jsx'
import { GoogleAdsProvider } from './context/GoogleAdsContext.jsx'
import AdGroups from './pages/google-ads/AdGroups.jsx'
import Ads from './pages/google-ads/Ads.jsx'
import Assets from './pages/google-ads/Assets.jsx'
import Budgets from './pages/google-ads/Budgets.jsx'
import Campaigns from './pages/google-ads/Campaigns.jsx'
import Connect from './pages/google-ads/Connect.jsx'
import Connected from './pages/google-ads/Connected.jsx'
import Dashboard from './pages/google-ads/Dashboard.jsx'
import Keywords from './pages/google-ads/Keywords.jsx'
import Reports from './pages/google-ads/Reports.jsx'
import Settings from './pages/google-ads/Settings.jsx'

export default function App() {
  return (
    <GoogleAdsProvider>
      <Routes>
        <Route path="/google-ads/connect" element={<Connect />} />
        <Route path="/google-ads/connected" element={<Connected />} />
        <Route path="/google-ads/callback" element={<Connected />} />
        <Route path="/google-ads" element={<GoogleAdsLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="ad-groups" element={<AdGroups />} />
          <Route path="ads" element={<Ads />} />
          <Route path="keywords" element={<Keywords />} />
          <Route path="assets" element={<Assets />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/google-ads" replace />} />
      </Routes>
    </GoogleAdsProvider>
  )
}
