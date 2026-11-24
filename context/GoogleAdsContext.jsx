import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { googleAdsApi, getNexionRole, getNexionSession, MOCK_MODE } from '../services/googleAdsApi.js'
import { clearGoogleAdsCache } from '../services/googleAdsCache.js'
import { MOCK_ACCOUNT } from '../config/googleAdsConfig.js'
import { mockAccounts } from '../data/googleAdsMockData.js'

const GoogleAdsContext = createContext()

export function GoogleAdsProvider({ children }) {
  const [isConnected, setIsConnected] = useState(MOCK_MODE)
  const [connectionId, setConnectionId] = useState(null)
  const [connections, setConnections] = useState([])
  const [connectionErrorStatus, setConnectionErrorStatus] = useState(null)
  const [connectionDetails, setConnectionDetails] = useState(null)
  const [isSharedConnection, setIsSharedConnection] = useState(false)
  const [account, setAccount] = useState(MOCK_MODE ? mockAccounts[0] || MOCK_ACCOUNT : null)
  const [isLoading, setIsLoading] = useState(!MOCK_MODE)
  const [error, setError] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const lastUserId = useRef(null)

  const checkConnection = useCallback(async () => {
    const userId = getNexionSession()?.userId || null
    if (lastUserId.current && lastUserId.current !== userId) clearGoogleAdsCache()
    lastUserId.current = userId
    if (MOCK_MODE) {
      setIsConnected(true)
      setConnectionId(null)
      setConnectionDetails(null)
      setIsSharedConnection(false)
      setAccount(mockAccounts[0] || MOCK_ACCOUNT)
      setError(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    setConnectionErrorStatus(null)
    try {
      const result = await googleAdsApi.checkConnection()
      const connections = result?.connections || []
      setConnections(connections)
      const activeConnection = connections.find((item) => item.connected && item.shared)
        || connections.find((item) => item.connected)
      const selectedConnectionId = activeConnection?.connectionId || result?.connectionId || null
      setIsConnected(Boolean((activeConnection?.connected || result?.connected) && selectedConnectionId))
      setConnectionId(selectedConnectionId)
      setConnectionDetails(activeConnection || (result?.connectionId ? result : null))
      setIsSharedConnection(activeConnection?.shared === true)
      const accounts = activeConnection?.googleAdsAccounts || []
      const assignedCustomerId = activeConnection?.customerId
      const selectedAccount = activeConnection?.googleAccount
        || accounts.find((item) => String(item.id).replace(/-/g, '') === String(assignedCustomerId || '').replace(/-/g, ''))
        || (assignedCustomerId ? { id: String(assignedCustomerId) } : null)
        || (accounts.length === 1 ? accounts[0] : null)
      setAccount(selectedAccount || result?.account || null)
    } catch (err) {
      setConnections([])
      setConnectionErrorStatus(err.status || null)
      setIsConnected(false)
      setConnectionId(null)
      setConnectionDetails(null)
      setIsSharedConnection(false)
      setAccount(null)
      setError(err.message || 'Unable to check Google Ads connection.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const connect = async () => {
    setError(null)
    if (MOCK_MODE) {
      markConnected(mockAccounts[0] || MOCK_ACCOUNT)
      window.location.href = '/google-ads'
      return
    }
    if (getNexionRole() !== 'superadmin') {
      setIsConnecting(true)
      try {
        const status = await googleAdsApi.checkConnection()
        const shared = status?.connections?.find((item) => item.connected && item.shared)
        if (shared) {
          setConnectionId(shared.connectionId)
          setConnectionDetails(shared)
          setIsSharedConnection(true)
          setIsConnected(true)
          const accounts = shared.googleAdsAccounts || []
          setAccount(shared.googleAccount || accounts.find((item) => String(item.id) === String(shared.customerId)) || (accounts.length === 1 ? accounts[0] : null))
          window.location.href = '/google-ads'
          return
        }
        throw new Error('Google Ads access has not been assigned to your account. Please contact your Super Admin.')
      } catch (err) {
        setError(err.message || 'Unable to load your company Google Ads connection.')
      } finally {
        setIsConnecting(false)
      }
      return
    }
    setIsConnecting(true)
    try {
      const result = await googleAdsApi.getAuthUrl()

      if (!result?.success || !result?.authUrl) {
        throw new Error(result?.message || 'Failed to get Google Ads authorization URL')
      }

      window.location.href = result.authUrl
    } catch (err) {
      setError(err.message || 'Failed to connect to Google Ads. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = async () => {
    if (getNexionRole() !== 'superadmin') throw new Error('Only a Super Admin can disconnect Google Ads.')
    if (isSharedConnection) throw new Error('This Google Ads connection is managed by your Super Admin.')
    if (MOCK_MODE) {
      setIsConnected(true)
      setConnectionId(null)
      setConnectionDetails(null)
      setAccount(mockAccounts[0] || MOCK_ACCOUNT)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await googleAdsApi.disconnect()
    } catch (err) {
      console.error('Disconnect error (proceeding with local cleanup):', err.message)
    } finally {
      clearGoogleAdsCache()
      setIsConnected(false)
      setConnectionId(null)
      setConnectionDetails(null)
      setAccount(null)
      setIsLoading(false)
    }
  }

  const markConnected = (accountInfo = null) => {
    setIsConnected(true)
    setAccount(accountInfo)
  }

  const clearError = () => setError(null)

  useEffect(() => {
    const completion = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('completion')
    if (completion) return undefined
    checkConnection()
  }, [])

  return (
    <GoogleAdsContext.Provider
      value={{
        isConnected,
        connectionId,
        connections,
        connectionErrorStatus,
        connectionDetails,
        isSharedConnection,
        isMockMode: MOCK_MODE,
        account,
        isLoading,
        error,
        isConnecting,
        connect,
        disconnect,
        checkConnection,
        markConnected,
        clearError,
      }}
    >
      {children}
    </GoogleAdsContext.Provider>
  )
}

export function useGoogleAds() {
  const context = useContext(GoogleAdsContext)
  if (!context) {
    throw new Error('useGoogleAds must be used within a GoogleAdsProvider')
  }
  return context
}
