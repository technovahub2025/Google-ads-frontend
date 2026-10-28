import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { googleAdsApi, MOCK_MODE } from '../services/googleAdsApi.js'
import { MOCK_ACCOUNT } from '../config/googleAdsConfig.js'

const GoogleAdsContext = createContext()

const STORAGE_KEYS = {
  connected: 'nexion_google_ads_connected',
  account: 'nexion_google_ads_account',
}

export function GoogleAdsProvider({ children }) {
  const [isConnected, setIsConnected] = useState(MOCK_MODE)
  const [account, setAccount] = useState(MOCK_MODE ? MOCK_ACCOUNT : null)
  const [isLoading, setIsLoading] = useState(!MOCK_MODE)
  const [error, setError] = useState(null)

  const checkConnection = useCallback(async () => {
    if (MOCK_MODE) {
      setIsConnected(true)
      setAccount(MOCK_ACCOUNT)
      setError(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await googleAdsApi.checkConnection()
      const connected = result?.connected === true
      const accountInfo = result?.account || null

      if (connected) {
        localStorage.setItem(STORAGE_KEYS.connected, 'true')
        if (accountInfo) {
          localStorage.setItem(STORAGE_KEYS.account, JSON.stringify(accountInfo))
        }
      }

      setIsConnected(connected)
      setAccount(accountInfo)
    } catch {
      const stored = localStorage.getItem(STORAGE_KEYS.connected)
      setIsConnected(stored === 'true')
      if (stored === 'true') {
        const storedAccount = localStorage.getItem(STORAGE_KEYS.account)
        setAccount(storedAccount ? JSON.parse(storedAccount) : null)
      } else {
        setAccount(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const connect = async () => {
    setError(null)
    if (MOCK_MODE) {
      markConnected(MOCK_ACCOUNT)
      window.location.href = '/google-ads'
      return
    }
    try {
      const result = await googleAdsApi.getAuthUrl()

      if (!result?.success || !result?.authUrl) {
        throw new Error(result?.message || 'Failed to get Google Ads authorization URL')
      }

      localStorage.setItem(STORAGE_KEYS.oauth_start, 'true')

      window.location.href = result.authUrl
    } catch (err) {
      setError(err.message || 'Failed to connect to Google Ads. Please try again.')
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
      localStorage.removeItem(STORAGE_KEYS.connected)
      localStorage.removeItem(STORAGE_KEYS.account)
      localStorage.removeItem(STORAGE_KEYS.oauth_start)
      setIsConnected(false)
      setAccount(null)
      setIsLoading(false)
    }
  }

  const markConnected = (accountInfo = null) => {
    localStorage.setItem(STORAGE_KEYS.connected, 'true')
    if (accountInfo) {
      localStorage.setItem(STORAGE_KEYS.account, JSON.stringify(accountInfo))
    }
    setIsConnected(true)
    setAccount(accountInfo)
  }

  const clearError = () => setError(null)

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const status = query.get('status')
    const connectedParam = query.get('connected')
    const successParam = query.get('success')

    const flagSet = status === 'success' || connectedParam === 'true' || successParam === 'true'

    if (flagSet) {
      markConnected()
      const newUrl = window.location.pathname.replace(/\/(connected|callback)$/, '') || '/google-ads'
      window.history.replaceState({}, '', newUrl)
    }

    checkConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <GoogleAdsContext.Provider
      value={{
        isConnected,
        isMockMode: MOCK_MODE,
        account,
        isLoading,
        error,
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
