import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import { getNexionRole } from '../../services/googleAdsApi.js'

export default function ConnectionStatus({ compact = false }) {
  const { isConnected, account, isSharedConnection, isLoading, isConnecting, error, connect } = useGoogleAds()
  const canManageConnection = getNexionRole() === 'superadmin'

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-label-sm' : 'font-body-md'}`}>
        <span className="material-symbols-outlined animate-spin">sync</span>
        <span className="text-on-surface-variant">Checking connection...</span>
      </div>
    )
  }

  if (isConnected) {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-google-ads-green"></span>
          <span className="font-label-sm text-label-sm text-google-ads-green">{isSharedConnection ? 'Connected by Super Admin' : 'Connected'}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-google-ads-green animate-pulse"></span>
          <span className="font-body-md text-body-md text-google-ads-green">{isSharedConnection ? 'Connected by Super Admin' : 'Connected'}</span>
        </div>
        {account?.name && (
          <span className="font-label-md text-label-md text-on-surface-variant">
            {account.name}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="w-2 h-2 rounded-full bg-error"></span>
      <span className={`text-error ${compact ? 'font-label-sm text-label-sm' : 'font-body-md'}`}>Not Connected</span>
      {canManageConnection ? <button
        onClick={connect}
        disabled={isConnecting}
        className="ads-button ads-button--primary ads-button--compact"
     >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button> : <span className="text-on-surface-variant">Managed by your Super Admin</span>}
      {error && <span role="alert" className="w-full text-sm text-error">{error}</span>}
    </div>
  )
}
