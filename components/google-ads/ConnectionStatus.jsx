import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'

export default function ConnectionStatus({ compact = false }) {
  const { isConnected, account, isLoading, connect, disconnect } = useGoogleAds()

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
          <span className="font-label-sm text-label-sm text-google-ads-green">Connected</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-google-ads-green animate-pulse"></span>
          <span className="font-body-md text-body-md text-google-ads-green">Connected</span>
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
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-error"></span>
      <span className={`text-error ${compact ? 'font-label-sm text-label-sm' : 'font-body-md'}`}>Not Connected</span>
      <button
        onClick={connect}
        className="ml-2 px-3 py-1 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-primary/90 transition-colors"
      >
        Connect
      </button>
    </div>
  )
}
