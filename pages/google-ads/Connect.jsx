import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import GoogleAdsLogo from '../../components/google-ads/GoogleAdsLogo.jsx'
import Toast from '../../components/google-ads/Toast.jsx'

export default function Connect() {
  const { connect, error, isLoading, isConnecting, isMockMode } = useGoogleAds()
  const [showToast, setShowToast] = useState(false)

  const handleConnect = async () => {
    try {
      await connect()
      setShowToast(true)
    } catch {
      setShowToast(true)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-body-md text-body-md text-on-surface-variant">Checking connection status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl shadow-soft p-10 text-center">
          <div className="flex justify-center mb-6">
            <GoogleAdsLogo variant="icon" className="w-16 h-16" />
          </div>

          <h1 className="font-headline-lg text-headline-lg text-primary mb-4">
            Connect Google Ads
          </h1>

          <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
            Connect your Google Ads account to manage campaigns, budgets, ads, and
            performance from Nexion.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-error-container border border-error text-on-error rounded-lg font-body-md text-body-md">
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 bg-google-ads-blue text-white font-label-md text-label-md py-3 px-6 rounded-xl hover:bg-google-ads-blue/90 transition-all duration-200 shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 1C5.58 1 2 4.58 2 9c0 3.99 3.13 7.31 7.14 7.9V13l-2.07-2.07.01-.01A6 6 0 0111.83 5.5c1.34 2.03 1.3 4.68-.1 6.36L9 15l2.95 2.95A7.96 7.96 0 0017 9c0-3.87-3.13-7-7-7z"
                fill="currentColor"
              />
            </svg>
            {isConnecting ? 'Connecting...' : isMockMode ? 'Open Demo Dashboard' : 'Connect Google Ads'}
          </button>

          <p className="font-label-sm text-label-sm text-on-surface-variant mt-4">
            {isMockMode
              ? 'Development preview: browse all pages using sample data. No Google account or backend is required.'
              : "You'll be redirected to Google to authorize this application."}
          </p>
          {isMockMode && <p className="mt-3 text-xs text-amber-800">LOCAL MOCK MODE — not a real Google Ads connection</p>}
        </div>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
          >
            ← Back to Nexion Home
          </Link>
        </div>
      </div>

      {showToast && (
        <Toast
          message={error || 'Redirecting to Google...'}
          type={error ? 'error' : 'info'}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
