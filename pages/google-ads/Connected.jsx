import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'

export default function Connected() {
  const { markConnected, error: contextError } = useGoogleAds()
  const [countdown, setCountdown] = useState(5)
  const navigate = useNavigate()

  useEffect(() => {
    markConnected()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleContinue = useCallback(() => {
    navigate('/google-ads')
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl shadow-soft p-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[36px]">check_circle</span>
            </div>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-primary mb-4">
            Google Ads Connected
          </h1>

          <p className="font-body-md text-body-md text-on-surface-variant mb-8">
            Your Google Ads account has been successfully connected. You can now manage
            your campaigns and view performance data from Nexion.
          </p>

          {contextError && (
            <div className="mb-4 p-3 bg-error-container border border-error text-on-error rounded-lg font-body-md text-body-md">
              {contextError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
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
