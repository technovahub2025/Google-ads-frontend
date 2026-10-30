import { useEffect, useState } from 'react'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import { googleAdsApi, getNexionRole } from '../../services/googleAdsApi.js'
import ConfirmDialog from '../../components/google-ads/ConfirmDialog.jsx'
import Toast from '../../components/google-ads/Toast.jsx'
import { GOOGLE_ADS_BACKEND } from '../../config/googleAdsConfig.js'

export default function Settings() {
  const { isConnected, account, disconnect, isLoading, connectionId } = useGoogleAds()
  const isSuperAdmin = getNexionRole() === 'superadmin'
  const [assignments, setAssignments] = useState([])
  const [assignmentUserId, setAssignmentUserId] = useState('')
  const [assignmentCustomerId, setAssignmentCustomerId] = useState('')
  const [assignmentError, setAssignmentError] = useState('')
  const [assignmentSaved, setAssignmentSaved] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (!isSuperAdmin) return
    googleAdsApi.getCustomerAssignments().then((result) => setAssignments(result.assignments || [])).catch((err) => setAssignmentError(err.message || 'Unable to load customer assignments.'))
  }, [isSuperAdmin])

  const saveAssignment = async (event) => {
    event.preventDefault()
    setAssignmentError('')
    setAssignmentSaved(false)
    try {
      await googleAdsApi.assignCustomerAccount({ userId: assignmentUserId.trim(), connectionId, customerId: assignmentCustomerId.trim() })
      const result = await googleAdsApi.getCustomerAssignments()
      setAssignments(result.assignments || [])
      setAssignmentUserId('')
      setAssignmentCustomerId('')
      setAssignmentSaved(true)
    } catch (err) { setAssignmentError(err.message || 'Unable to save this assignment.') }
  }

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

      {isSuperAdmin && (
        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft p-6 space-y-4">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary">Customer assignments</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Assign one accessible Google Ads customer account to a Nexion user.</p>
          </div>
          <form onSubmit={saveAssignment} className="grid gap-3 sm:grid-cols-3">
            <input required value={assignmentUserId} onChange={(e) => setAssignmentUserId(e.target.value)} placeholder="Nexion user ID" aria-label="Nexion user ID" className="rounded-lg border border-surface-variant bg-surface px-3 py-2" />
            <input required value={connectionId || ''} readOnly placeholder="Manager connection" aria-label="Manager connection" className="rounded-lg border border-surface-variant bg-surface px-3 py-2" />
            <div className="flex gap-2"><input required value={assignmentCustomerId} onChange={(e) => setAssignmentCustomerId(e.target.value)} placeholder="Google Ads customer ID" aria-label="Google Ads customer ID" className="min-w-0 flex-1 rounded-lg border border-surface-variant bg-surface px-3 py-2" /><button disabled={!connectionId} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50">Assign</button></div>
          </form>
          {assignmentError && <p role="alert" className="text-sm text-error">{assignmentError}</p>}
          {assignmentSaved && <p role="status" className="text-sm text-google-ads-green">Customer assignment saved.</p>}
          <ul className="divide-y divide-surface-variant text-sm">
            {assignments.map((item) => <li key={item.userId} className="flex flex-wrap justify-between gap-2 py-2"><span>Nexion user {item.userId}</span><span>Customer {item.customerId}</span></li>)}
          </ul>
        </section>
      )}

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
