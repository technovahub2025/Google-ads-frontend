import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { googleAdsApi, MOCK_MODE } from '../services/googleAdsApi.js'
import { GOOGLE_ADS_BACKEND, MOCK_ACCOUNT } from '../config/googleAdsConfig.js'

const GoogleAdsContext = createContext()

// TEMPORARY DEV FALLBACK: use this returned connection ID for testing, then remove it.
const TEMPORARY_TEST_CONNECTION_ID = 'USER_001'

export function GoogleAdsProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionId, setConnectionId] = useState(null)
  const [account, setAccount] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const checkConnection = useCallback(async () => {
    if (MOCK_MODE && !GOOGLE_ADS_BACKEND) {
      setIsConnected(true)
      setConnectionId(null)
      setAccount(MOCK_ACCOUNT)
      setError(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await googleAdsApi.checkConnection()
      const connections = result?.connections || []
      const activeConnection = import.meta.env.DEV
        ? connections.find((item) => item.connectionId === TEMPORARY_TEST_CONNECTION_ID && item.connected)
        : connections.find((item) => item.connected)
      const selectedConnectionId = activeConnection?.connectionId || (!import.meta.env.DEV ? result?.connectionId : null)
      setIsConnected(Boolean(selectedConnectionId && (activeConnection?.connected || result?.connected)))
      setConnectionId(selectedConnectionId || null)
      setAccount(result?.account || null)
    } catch (err) {
      setIsConnected(false)
      setConnectionId(null)
      setAccount(null)
      setError(err.message || 'Unable to check Google Ads connection.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const connect = async () => {
    setError(null)
    if (MOCK_MODE && !GOOGLE_ADS_BACKEND) {
      markConnected(MOCK_ACCOUNT)
      window.location.href = '/google-ads'
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
    setIsLoading(true)
    setError(null)
    try {
      await googleAdsApi.disconnect()
    } catch (err) {
      console.error('Disconnect error (proceeding with local cleanup):', err.message)
    } finally {
      setIsConnected(false)
      setConnectionId(null)
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
    checkConnection()
  }, [])

  return (
    <GoogleAdsContext.Provider
      value={{
        isConnected,
        connectionId,
        isMockMode: MOCK_MODE && !GOOGLE_ADS_BACKEND,
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
