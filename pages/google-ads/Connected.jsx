import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import { googleAdsApi } from '../../services/googleAdsApi.js'

export default function Connected() {
  const { isConnected, isLoading, error: contextError, checkConnection } = useGoogleAds()
  const [countdown, setCountdown] = useState(5)
  const [completion, setCompletion] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('completion'))
  const [completionState, setCompletionState] = useState(() => completion ? 'loading' : null)
  const [completionError, setCompletionError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (completion) {
      let active = true
      googleAdsApi.completeClientInvitation(completion)
        .then(() => { if (active) setCompletionState('success') })
        .catch((error) => { if (active) { setCompletionState('error'); setCompletionError(error.message || 'This Google Ads completion link is invalid or expired.') } })
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
      return () => { active = false }
    }
    checkConnection()
  }, [checkConnection, completion])

  useEffect(() => {
    if (!isConnected) return undefined
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/google-ads')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isConnected, navigate])

  const handleContinue = useCallback(() => {
    navigate('/google-ads')
  }, [navigate])

  if (completion && completionState === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-surface"><p className="font-body-md text-body-md text-on-surface-variant">Confirming your Google Ads connection...</p></div>
  }

  if (completion && completionState === 'error') {
    return <div className="min-h-screen flex items-center justify-center bg-surface"><div className="max-w-md p-8 text-center"><h1 className="ads-page-title mb-3">Google Ads connection could not be confirmed</h1><p className="font-body-md text-body-md text-error">{completionError}</p></div></div>
  }

  if (!completion && isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface"><p className="font-body-md text-body-md text-on-surface-variant">Checking Google Ads connection...</p></div>
  }

  if (!completion && !isConnected) {
    return (
      <div className="ads-page flex items-center justify-center">
        <div className="ads-card ads-card-padding w-full max-w-md text-center sm:p-8">
          <h1 className="ads-page-title mb-3">Google Ads Not Connected</h1>
          <p className="ads-description mb-5">{contextError || 'The backend has not confirmed a Google Ads connection yet.'}</p>
          <button onClick={() => navigate('/google-ads/connect')} className="ads-button ads-button--primary">Return to connection</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ads-page flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="ads-card ads-card-padding text-center sm:p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[36px]">check_circle</span>
            </div>
          </div>

          <h1 className="ads-page-title mb-3">
            Google Ads Connected
          </h1>

          <p className="ads-description mb-5">
            Your Google Ads account has been successfully connected. You can now manage
            your campaigns and view performance data from Nexion.
          </p>

          {contextError && (
            <div className="mb-4 p-3 bg-error-container border border-error text-error rounded-lg font-body-md text-body-md">
            {contextError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="ads-button ads-button--primary w-full"
           >
              <span>Continue to Google Ads Dashboard</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>

            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Redirecting automatically in {countdown} seconds...
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <a
            href="/google-ads/connect"
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
         >
            ← Back to connection page
          </a>
        </div>
      </div>
    </div>
  )
}
