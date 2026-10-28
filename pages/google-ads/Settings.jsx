import { useState } from 'react'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import ConfirmDialog from '../../components/google-ads/ConfirmDialog.jsx'
import Toast from '../../components/google-ads/Toast.jsx'
import { GOOGLE_ADS_BACKEND } from '../../config/googleAdsConfig.js'

export default function Settings() {
  const { isConnected, account, disconnect, isLoading } = useGoogleAds()
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setShowToast(true)
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-body-md text-body-md text-on-surface-variant">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-stack-lg max-w-3xl">
      <h2 className="font-headline-md text-headline-md text-primary">Google Ads Settings</h2>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft p-6">
        <h3 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">cloud_sync</span>
          Google Ads Connection
        </h3>

        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-google-ads-green animate-pulse' : 'bg-error'}`}></div>
            <span className={`font-label-md text-label-md font-medium ${isConnected ? 'text-google-ads-green' : 'text-error'}`}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div
            className={`px-3 py-1 rounded-full font-label-sm text-label-sm ${
              isConnected
                ? 'bg-google-ads-green/10 text-google-ads-green'
                : 'bg-error/10 text-error'
            }`}
          >
            {isConnected ? 'Active' : 'Inactive'}
          </div>
        </div>

        {isConnected && account && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between py-2 border-b border-surface-variant">
              <span className="font-label-md text-label-md text-on-surface-variant">Account ID</span>
              <span className="font-body-md text-body-md text-on-surface">{account.id}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-variant">
              <span className="font-label-md text-label-md text-on-surface-variant">Account Name</span>
              <span className="font-body-md text-body-md text-on-surface">{account.name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-variant">
              <span className="font-label-md text-label-md text-on-surface-variant">Currency</span>
              <span className="font-body-md text-body-md text-on-surface">{account.currency}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-variant">
              <span className="font-label-md text-label-md text-on-surface-variant">Time Zone</span>
              <span className="font-body-md text-body-md text-on-surface">{account.timeZone}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {isConnected ? (
            <>
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-error text-on-error font-label-md text-label-md rounded-lg hover:bg-error/90 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">link_off</span>
                Disconnect Google Ads
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container transition-colors border border-surface-variant"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Reconnect Google Ads
              </button>
            </>
          ) : (
            <button
              onClick={() => window.location.href = '/google-ads/connect'}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">link</span>
              Connect Google Ads
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft p-6">
        <h3 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">info</span>
          Connection Details
        </h3>
        <div className="space-y-3 font-body-md text-body-md">
          <p className="text-on-surface-variant">
            This connection uses OAuth 2.0 to securely authorize Nexion to access your
            Google Ads data. No credentials are stored in the frontend.
          </p>
          <p className="text-on-surface-variant">
            The Google Ads backend at <code className="bg-surface-container-low px-2 py-1 rounded text-google-ads-blue">{GOOGLE_ADS_BACKEND || window.location.origin}</code> handles
            all OAuth token management. Tokens are securely stored on the backend.
          </p>
          <p className="text-on-surface-variant">
            Disconnecting will revoke access immediately. You can reconnect at any time.
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Google Ads?"
        message="This will revoke access to your Google Ads account. All saved tokens will be removed. This action cannot be undone."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        variant="danger"
      />

      {showToast && (
        <Toast
          message="Google Ads account disconnected successfully."
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
