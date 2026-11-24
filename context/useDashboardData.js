import { useEffect, useState } from 'react'
import { googleAdsApi } from '../services/googleAdsApi.js'
import { dashboardReport } from '../utils/googleAdsDashboard.js'
import { getNexionSession } from '../services/googleAdsApi.js'
const dashboardSnapshots = new Map()
const readGoogleAdsCache = (key) => dashboardSnapshots.get(key)
const writeGoogleAdsCache = (key, value) => dashboardSnapshots.set(key, value)
const isCancellation = (error, signal) => Boolean(signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || error?.code === 'ERR_CANCELED' || /(?:abort|cancell?ed|cancell?ation)/i.test(String(error?.message || '')))

export function useDashboardData({ account, accountsLoading, dateRange, startDate, endDate }) {
  const [reportState, setReportState] = useState(null)
  const { connectionId, id: customerId } = account || {}
  const customValid = dateRange !== 'custom' || Boolean(startDate && endDate && startDate <= endDate)
  const ready = !accountsLoading && Boolean(connectionId && customerId) && customValid
  const requestKey = JSON.stringify([connectionId, customerId, dateRange, startDate, endDate])

  useEffect(() => {
    const userId = (typeof getNexionSession === 'function' ? getNexionSession()?.userId : null) || 'anonymous'
    const cacheKey = `page:dashboard:${userId}:${requestKey}`
    setReportState(readGoogleAdsCache(cacheKey) || null)
    if (!ready) return
    let active = true
    const abort = new AbortController()
    const selection = { connectionId, customerId, dateRange, startDate, endDate }
    googleAdsApi.getCustomerCampaigns(connectionId, customerId, { dateRange, startDate, endDate, includePrevious: true, signal: abort.signal }).then((response) => {
      const report = dashboardReport(response, selection)
      if (active) { const snapshot = { requestKey, ...report }; writeGoogleAdsCache(cacheKey, snapshot); setReportState(snapshot) }
    }).catch((error) => {
      if (active && !isCancellation(error, abort.signal)) setReportState({ requestKey, error: error.message })
    })
    return () => { active = false; abort.abort() }
  }, [ready, connectionId, customerId, dateRange, startDate, endDate, requestKey])

  const report = ready && reportState?.requestKey === requestKey ? reportState : null
  return {
    loading: accountsLoading || (ready && !report),
    error: report?.error || null,
    report: report?.error ? null : report,
    needsCustomDates: !customValid,
  }
}
