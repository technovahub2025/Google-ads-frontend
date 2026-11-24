import { useEffect, useState } from 'react'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import { googleAdsApi, getNexionRole } from '../../services/googleAdsApi.js'
import ConfirmDialog from '../../components/google-ads/ConfirmDialog.jsx'
import Toast from '../../components/google-ads/Toast.jsx'
import { GOOGLE_ADS_BACKEND } from '../../config/googleAdsConfig.js'

export default function Settings() {
  const { isConnected, account, disconnect, isLoading, connectionId, connectionDetails, isSharedConnection } = useGoogleAds()
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
          <p className="min-w-0 text-sm leading-6 text-on-surface [overflow-wrap:anywhere]-variant">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ads-stack max-w-5xl">
      <h2 className="ads-page-title">Google Ads Settings</h2>

      <div className="ads-card ads-card-padding">
        <h3 className="ads-section-title mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">cloud_sync</span>
          Google Ads Connection
        </h3>

        <div className="ads-toolbar p-4 bg-surface-container-low rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-google-ads-green animate-pulse' : 'bg-error'}`}></div>
            <span className={`font-label-md text-label-md font-medium ${isConnected ? 'text-google-ads-green' : 'text-error'}`}>
              {isConnected ? (isSharedConnection ? 'Connected by Super Admin' : 'Connected') : 'Not Connected'}
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
            <div className="grid gap-1 border-b border-surface-variant py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-3">
              <span className="text-sm font-medium leading-5 text-slate-600">Account ID</span>
              <span className="min-w-0 text-sm leading-6 text-on-surface [overflow-wrap:anywhere]">{account.id}</span>
            </div>
            <div className="grid gap-1 border-b border-surface-variant py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-3">
              <span className="text-sm font-medium leading-5 text-slate-600">Account Name</span>
              <span className="min-w-0 text-sm leading-6 text-on-surface [overflow-wrap:anywhere]">{account.name}</span>
            </div>
            <div className="grid gap-1 border-b border-surface-variant py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-3">
              <span className="text-sm font-medium leading-5 text-slate-600">Currency</span>
              <span className="min-w-0 text-sm leading-6 text-on-surface [overflow-wrap:anywhere]">{account.currency}</span>
            </div>
            <div className="grid gap-1 border-b border-surface-variant py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-3">
              <span className="text-sm font-medium leading-5 text-slate-600">Time Zone</span>
              <span className="min-w-0 text-sm leading-6 text-on-surface [overflow-wrap:anywhere]">{account.timeZone}</span>
            </div>
          </div>
        )}

        {isConnected && connectionDetails && (
          <div className="mb-6 space-y-2 rounded-lg bg-surface-container-low p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span className="text-on-surface-variant">Connection</span><span className="break-all font-mono text-on-surface">{connectionId}</span></div>
            {connectionDetails.customerId && <div className="flex flex-wrap justify-between gap-2"><span className="text-on-surface-variant">Google Ads Customer ID</span><span className="break-all font-mono text-on-surface">{connectionDetails.customerId}</span></div>}
            {isSharedConnection && <p role="status" className="pt-1 text-on-surface-variant">Connected by Super Admin. You can use the customer account assigned to your NEXION user.</p>}
            {Array.isArray(connectionDetails.googleAdsAccounts) && connectionDetails.googleAdsAccounts.length > 1 && (
              <ul className="divide-y divide-surface-variant">
                {connectionDetails.googleAdsAccounts.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2"><span className="text-on-surface">{item.name || 'Google Ads account'}</span><span className="break-all font-mono text-on-surface-variant">{item.id}</span></li>)}
              </ul>
            )}
          </div>
        )}

        <div className="ads-actions">
          {isConnected && isSharedConnection ? (
            <p role="status" className="text-sm text-on-surface-variant">This connection is managed centrally by your Super Admin. You can use it for this company, but you cannot replace or disconnect it.</p>
          ) : isConnected && isSuperAdmin ? (
            <>
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="ads-button ads-button--danger"
             >
                <span className="material-symbols-outlined text-[18px]">link_off</span>
                Disconnect Google Ads
              </button>
              <button
                onClick={() => window.location.reload()}
                className="ads-button"
             >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Reconnect Google Ads
              </button>
            </>
          ) : isConnected ? (
            <p role="status" className="text-sm text-on-surface-variant">This connection is managed by your Super Admin. Contact them to change or disconnect it.</p>
          ) : isSuperAdmin ? (
            <button
              onClick={() => window.location.href = '/google-ads/connect'}
              className="ads-button ads-button--primary"
           >
              <span className="material-symbols-outlined text-[18px]">link</span>
              Connect Google Ads
            </button>
          ) : <p role="status" className="text-sm text-on-surface-variant">Google Ads access has not been assigned to your account. Please contact your Super Admin.</p>}
        </div>
      </div>

      {isSuperAdmin && (
        <section className="ads-card ads-card-padding space-y-4">
          <div>
            <h3 className="ads-section-title">Customer assignments</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Assign one accessible Google Ads customer account to a Nexion user.</p>
          </div>
          <form onSubmit={saveAssignment} className="grid min-w-0 gap-3 sm:grid-cols-2">
            <input required value={assignmentUserId} onChange={(e) => setAssignmentUserId(e.target.value)} placeholder="Nexion user ID" aria-label="Nexion user ID" className="ads-control" />
            <input required value={connectionId || ''} readOnly placeholder="Manager connection" aria-label="Manager connection" className="ads-control" />
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:col-span-2"><input required value={assignmentCustomerId} onChange={(e) => setAssignmentCustomerId(e.target.value)} placeholder="Google Ads customer ID" aria-label="Google Ads customer ID" className="ads-control" /><button disabled={!connectionId} className="ads-button ads-button--primary shrink-0">Assign</button></div>
          </form>
          {assignmentError && <p role="alert" className="text-sm text-error">{assignmentError}</p>}
          {assignmentSaved && <p role="status" className="text-sm text-google-ads-green">Customer assignment saved.</p>}
          <ul className="divide-y divide-surface-variant text-sm">
            {assignments.map((item) => <li key={item.userId} className="flex flex-wrap justify-between gap-2 py-2"><span>Nexion user {item.userId}</span><span>Customer {item.customerId}</span></li>)}
          </ul>
        </section>
      )}

      <div className="ads-card ads-card-padding">
        <h3 className="ads-section-title mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">info</span>
          Connection Details
        </h3>
        <div className="space-y-3 font-body-md text-body-md">
          <p className="text-on-surface-variant">
            This connection uses OAuth 2.0 to securely authorize Nexion to access your
            Google Ads data. No credentials are stored in the frontend.
          </p>
          <p className="text-on-surface-variant">
            The Google Ads backend at <code className="break-all rounded bg-surface-container-low px-2 py-1 text-blue-800">{GOOGLE_ADS_BACKEND || window.location.origin}</code> handles
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
