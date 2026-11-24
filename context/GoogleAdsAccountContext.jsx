import { createContext, useContext, useEffect, useState } from 'react'
import { useGoogleAds } from './GoogleAdsContext.jsx'
import { googleAdsApi, getNexionSession } from '../services/googleAdsApi.js'
import { dashboardAccounts } from '../utils/googleAdsDashboard.js'

const AccountContext = createContext(null)
export function GoogleAdsAccountProvider({ children }) {
  const { connections = [], connectionId, isLoading } = useGoogleAds()
  const connectionIds = connections.filter((item) => item.connected).map((item) => item.connectionId)
  if (!connectionIds.length && connectionId) connectionIds.push(connectionId)
  const scopeKey = JSON.stringify(connectionIds)
  const storageKey = `googleAdsAccount:${getNexionSession()?.userId || ''}`
  const [state, setState] = useState(null)
  const [selectedKey, setSelectedKey] = useState(() => {
    try { return window.sessionStorage.getItem(storageKey) || '' } catch { return '' }
  })
  const selectAccount = (key) => {
    setSelectedKey(key)
    try { window.sessionStorage.setItem(storageKey, key) } catch { /* Selection still works in memory. */ }
  }
  useEffect(() => {
    if (isLoading) return
    let active = true
    const abort = new AbortController()
    setState(null)
    Promise.allSettled(JSON.parse(scopeKey).map(async (id) => {
      const result = await googleAdsApi.getCustomerAccounts(id, { liveOnly: true, signal: abort.signal })
      if (!result?.success || !Array.isArray(result.accounts)) throw new Error('Customer account discovery failed')
      return dashboardAccounts(result.accounts).map((account) => ({ ...account, connectionId: id, key: `${id}:${account.id}` }))
    })).then((results) => {
      if (!active) return
      setState({ scopeKey, accounts: results.flatMap((item) => item.status === 'fulfilled' ? item.value : []), errors: results.filter((item) => item.status === 'rejected').map((item) => item.reason.message) })
    })
    return () => { active = false; abort.abort() }
  }, [scopeKey, isLoading])
  const accounts = !isLoading && state?.scopeKey === scopeKey ? state.accounts : []
  const selected = accounts.find((item) => item.key === selectedKey) || accounts[0] || null
  return <AccountContext.Provider value={{ accounts, selected, selectAccount, loading: isLoading || state?.scopeKey !== scopeKey, errors: state?.scopeKey === scopeKey ? state.errors : [] }}>{children}</AccountContext.Provider>
}
export function useGoogleAdsAccount() { return useContext(AccountContext) }
