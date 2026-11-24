import {
  mockOverviewStats,
  mockAccounts,
  mockCampaigns,
  mockAdGroups,
  mockKeywords,
  mockAds,
  mockAssets,
  mockBudgets,
  mockReports,
} from '../data/googleAdsMockData.js'
import { GOOGLE_ADS_BACKEND, MOCK_ACCOUNT, MOCK_MODE } from '../config/googleAdsConfig.js'
import * as cacheModule from './googleAdsCache.js'

const fallbackCache = (() => {
  const values = new Map()
  return {
    fetchGoogleAdsCache: (key, fetcher, options = {}) => values.has(key) ? Promise.resolve(values.get(key)) : Promise.resolve().then(() => fetcher(options.signal)).then((data) => { values.set(key, data); return data }),
    invalidateGoogleAdsCache: (prefix = '') => { for (const key of values.keys()) if (key.startsWith(prefix)) values.delete(key) },
  }
})()
const cache = typeof cacheModule !== 'undefined' && cacheModule.fetchGoogleAdsCache ? cacheModule : fallbackCache

let bridgedNexionToken = ''
let bridgedNexionUser = null
let nexionAuthBridgePromise = null

export function initializeNexionAuthBridge() {
  if (nexionAuthBridgePromise) return nexionAuthBridgePromise

  const parentOrigin = import.meta.env.VITE_NEXION_PARENT_ORIGIN || ''
  if (window.parent === window || !parentOrigin) return Promise.resolve(false)

  nexionAuthBridgePromise = new Promise((resolve) => {
    let settled = false
    const finish = () => {
      window.removeEventListener('message', handleAuthResponse)
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      resolve(Boolean(bridgedNexionToken))
    }
    const handleAuthResponse = (event) => {
      if (event.origin !== parentOrigin || event.source !== window.parent) return
      if (event.data?.type !== 'nexion-auth-response' || typeof event.data.token !== 'string' || !event.data.token) return
      bridgedNexionToken = event.data.token
      bridgedNexionUser = event.data.user || null
      try {
        const storageKey = import.meta.env.VITE_TOKEN_KEY || 'authToken'
        window.localStorage.setItem(storageKey, bridgedNexionToken)
      } catch { /* The in-memory token still authorizes API calls if storage is unavailable. */ }
      finish()
    }
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(false)
      }
    }, 5000)
    window.addEventListener('message', handleAuthResponse)
    try {
      window.parent.postMessage({ type: 'nexion-auth-request' }, parentOrigin)
    } catch {
      window.removeEventListener('message', handleAuthResponse)
      finish()
    }
  })

  return nexionAuthBridgePromise
}

export function getNexionToken() {
  const key = import.meta.env.VITE_TOKEN_KEY || 'authToken'
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try {
      const storage = window[storageName]
      for (const name of [key, 'authToken', 'token']) {
        const token = storage.getItem(name)
        if (token) return token.trim().replace(/^Bearer\s+/i, '')
      }
    } catch { /* The in-memory bridge also works when browser storage is blocked. */ }
  }
  return bridgedNexionToken.trim().replace(/^Bearer\s+/i, '')
}

export function getNexionSession() {
  try {
    const token = getNexionToken()
    const payload = token.split('.')[1]
    if (!payload) return null
    const user = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (!(user.userId || user.id || user._id) || (user.exp && user.exp * 1000 <= Date.now())) return null
    // This only shapes navigation. The backend verifies the JWT and account access.
    return { role: String(user.role || 'user').toLowerCase(), userId: String(user.userId || user.id || user._id) }
  } catch { return null }
}

export function getNexionRole() {
  return getNexionSession()?.role || ''
}

async function googleAdsFetch(endpoint, { requireNexionToken = false, ...options } = {}) {
  if (!GOOGLE_ADS_BACKEND) {
    throw new Error('Set VITE_GOOGLE_ADS_API_URL to the Google Ads backend URL.')
  }

  const url = `${GOOGLE_ADS_BACKEND}${endpoint}`
  const jwt = getNexionToken()
  if (requireNexionToken && !jwt) throw new Error('Sign in to NEXION again to load campaign creation options.')
  const headers = new Headers({ 'Content-Type': 'application/json', ...options.headers })
  headers.delete('Authorization')
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`)

  // Bypass ngrok browser warning for API requests.
  headers.set('ngrok-skip-browser-warning', 'true')
  const res = await fetch(url, { ...options, headers })

  let data = null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await res.json()
  }

  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed with status ${res.status}`
    const error = new Error(message)
    error.status = res.status
    error.code = data?.code
    error.diagnosticId = data?.diagnosticId
    error.creationUncertain = data?.creationUncertain === true
    throw error
  }

  return data
}

const isOptionList = (value, ...fields) => Array.isArray(value) && value.every((item) =>
  item && fields.every((field) => typeof item[field] === 'string' && item[field].length > 0))

const creationOptionsChecks = new Map([
  ['locations', (data) => isOptionList(data, 'id', 'name')],
  ['languages', (data) => isOptionList(data, 'id', 'name')],
  ['goals', (data) => isOptionList(data?.goals, 'key', 'category', 'origin') && isOptionList(data?.actions, 'id', 'name', 'goalKey', 'status')],
  ['audiences', (data) => isOptionList(data?.options, 'id', 'name', 'category', 'type') && Array.isArray(data?.unavailable)],
])

export const googleAdsApi = {
  getBilling: async (signal) => {
    const key = `billing:${getNexionSession()?.userId || 'anonymous'}`
    const result = await cache.fetchGoogleAdsCache(key, (requestSignal) => googleAdsFetch('/api/google-ads/billing', { signal: requestSignal, cache: 'no-store' }), { ttl: 60_000, signal })
    if (result?.success !== true || result.billing?.connectionStatus !== 'connected' || !/^\d{10}$/.test(result.billing?.account?.customerId)) {
      throw new Error('Google Ads billing details could not be verified. Try again.')
    }
    return result.billing
  },
  managementList: async (path, connectionId, customerId, signal) => {
    if (!connectionId || !/^\d{10}$/.test(customerId)) throw new Error('Select an authorized Google Ads customer account.')
    const key = `management:${connectionId}:${customerId}:${path}`
    return cache.fetchGoogleAdsCache(key, (requestSignal) => googleAdsFetch(`/api/google-ads/${path}?${new URLSearchParams({ connectionId, customerId })}`, { signal: requestSignal }), { signal })
  },
  campaignCreationOptions: async (selection, kind, { q, signal } = {}) => {
    if (!selection?.connectionId || !/^\d{10}$/.test(selection.id)) throw new Error('Select an authorized Google Ads customer account.')
    const check = creationOptionsChecks.get(kind)
    if (!check) throw new Error('Unknown campaign creation options.')
    const params = new URLSearchParams({ connectionId: selection.connectionId, customerId: selection.id, kind })
    if (kind === 'locations' && q?.trim()) params.set('q', q.trim())
    let result
    try {
      result = await googleAdsFetch('/api/google-ads/campaigns/creation-options?' + params, { method: 'GET', signal, requireNexionToken: true })
    } catch (error) {
      if (error.status === 401) throw new Error('Sign in to NEXION again to load campaign creation options.', { cause: error })
      throw error
    }
    if (result?.success !== true || !check(result.data)) throw new Error('Google Ads returned an invalid response for these campaign options. Try again.')
    return result.data
  },
  managementChange: async (path, method, selection, values) => {
    if (!selection?.connectionId || !selection?.id) throw new Error('Select an authorized Google Ads customer account.')
    const creatingCampaign = path === 'campaigns' && method === 'POST'
    try {
      const result = await googleAdsFetch('/api/google-ads/' + path, { method, body: JSON.stringify({ ...values, connectionId: selection.connectionId, customerId: selection.id }) })
      cache.invalidateGoogleAdsCache(`management:${selection.connectionId}:${selection.id}:`)
      cache.invalidateGoogleAdsCache(`dashboard:${selection.connectionId}:${selection.id}:`)
      if (result?.success !== true || result.data?.success !== true) throw new Error('Google Ads did not confirm the change. Refresh before retrying.')
      if (creatingCampaign && (result.data.campaignType !== 'PERFORMANCE_MAX' || !/^\d+$/.test(result.data.campaignId) || !result.data.status || !Array.isArray(result.data.assetGroups))) {
        throw new Error('Google Ads returned an incomplete campaign confirmation.')
      }
      return result
    } catch (error) {
      if (creatingCampaign && (!error.status || (error.status >= 500 && !error.diagnosticId))) {
        error.creationUncertain = true
        error.message = 'Campaign creation could not be confirmed. Refresh the campaign list and check the campaign name before trying again.'
      }
      throw error
    }
  },
  /* ============================================
     OAuth / Connection Management
     ============================================ */

  getAuthUrl: async () => {
    if (MOCK_MODE) return { success: true, mock: true, authUrl: null, message: 'Development mode is enabled; Google OAuth is disabled.' }
    const data = await googleAdsFetch('/api/google-ads/auth')
    return data
  },

  checkConnection: async () => {
    if (MOCK_MODE) return { success: true, connected: true, account: mockAccounts[0] || MOCK_ACCOUNT, mock: true }
    try {
      return await googleAdsFetch('/api/google-ads/connection')
    } catch (error) {
      if (error.status === 404) return { success: true, connected: false }
      throw error
    }
  },

  completeClientInvitation: async (completion) => googleAdsFetch('/api/google-ads/client-completion', {
    method: 'POST',
    body: JSON.stringify({ completion }),
  }),

  disconnect: async () => {
    if (MOCK_MODE) return { success: true, mock: true }
    const data = await googleAdsFetch('/api/google-ads/disconnect', {
      method: 'POST',
    })
    return data
  },

  /* ============================================
     Placeholder for real data endpoints.

     These methods currently return mock data so the
     UI is fully functional during frontend development.

     Once the Google Ads backend exposes real reporting
     APIs, replace the mock returns with real googleAdsFetch
     calls — the data shapes are kept compatible.
     ============================================ */

  getOverviewStats: async () => {
    if (MOCK_MODE) return { data: mockOverviewStats }
    return googleAdsFetch('/api/google-ads/overview')
  },

  getAccounts: async () => {
    if (MOCK_MODE) return { data: mockAccounts }
    const result = await googleAdsFetch('/api/google-ads/connection')
    return { data: (result.connections || []).filter((item) => item.connected).map((item) => item.googleAccount || { id: item.customerId }) }
  },

  getCampaigns: async () => {
    if (MOCK_MODE) return { data: mockCampaigns }
    return googleAdsFetch('/api/google-ads/campaigns')
  },

  getCustomerAccounts: async (connectionId, { signal, liveOnly = false } = {}) => {
    if (MOCK_MODE && !liveOnly) return { success: true, accounts: mockAccounts }
    if (!connectionId) throw new Error('A Google Ads connection is required to load customer accounts.')
    const key = `accounts:${connectionId}:${liveOnly ? 'live' : 'cached'}`
    return cache.fetchGoogleAdsCache(key, (requestSignal) => googleAdsFetch(`/api/google-ads/customer-accounts?connectionId=${encodeURIComponent(connectionId)}`, { signal: requestSignal }), { ttl: 300_000, signal })
  },

  getCustomerAssignments: async () => googleAdsFetch('/api/google-ads/customer-assignments'),

  getNexionUsers: async () => googleAdsFetch('/api/google-ads/nexion-users'),

  getClients: async () => googleAdsFetch('/api/google-ads/clients'),

  sendClientConnectionInvitation: async (clientId) => googleAdsFetch(`/api/google-ads/clients/${encodeURIComponent(clientId)}/connect`, {
    method: 'POST',
  }),

  createClient: async ({ name, email, nexionUserId }) => googleAdsFetch('/api/google-ads/clients', {
    method: 'POST', body: JSON.stringify({ name, email, ...(nexionUserId ? { nexionUserId } : {}) }),
  }),

  updateClient: async ({ clientId, name, email }) => googleAdsFetch(`/api/google-ads/clients/${encodeURIComponent(clientId)}`, {
    method: 'PATCH', body: JSON.stringify({ name, email }),
  }),

  assignGoogleAdsAccountToClient: async ({ clientId, nexionUserId, connectionId, customerId }) => googleAdsFetch(`/api/google-ads/clients/${encodeURIComponent(clientId)}/account`, {
    method: 'POST', body: JSON.stringify({ nexionUserId, connectionId, customerId }),
  }),

  revokeGoogleAdsClientAssignment: async (clientId) => googleAdsFetch(`/api/google-ads/clients/${encodeURIComponent(clientId)}/assignment`, {
    method: 'DELETE',
  }),

  assignCustomerAccount: async ({ userId, connectionId, customerId }) => googleAdsFetch('/api/google-ads/customer-assignments', {
    method: 'POST', body: JSON.stringify({ userId, connectionId, customerId }),
  }),

  revokeCustomerAssignment: async (userId) => googleAdsFetch(`/api/google-ads/customer-assignments/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  }),

  getCustomerCampaigns: async (connectionId, customerId, { dateRange, startDate, endDate, includePrevious = false, signal } = {}) => {
    if (MOCK_MODE && !dateRange) return { success: true, campaigns: mockCampaigns }
    if (!connectionId || !customerId) {
      throw new Error('A Google Ads connection and customer account are required to load campaigns.')
    }
    const params = new URLSearchParams({ connectionId, customerId })
    if (dateRange) params.set('dateRange', dateRange)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (includePrevious) params.set('includePrevious', 'true')
    const key = `dashboard:${connectionId}:${customerId}:${params.toString()}`
    return cache.fetchGoogleAdsCache(key, (requestSignal) => googleAdsFetch(`/api/google-ads/campaigns?${params}`, { signal: requestSignal }), { signal })
  },

  getAdGroups: async () => {
    if (MOCK_MODE) return { data: mockAdGroups }
    try {
      return await googleAdsFetch('/api/google-ads/ad-groups')
    } catch {
      return { data: mockAdGroups }
    }
  },

  getKeywords: async () => {
    if (MOCK_MODE) return { data: mockKeywords }
    try {
      return await googleAdsFetch('/api/google-ads/keywords')
    } catch {
      return { data: mockKeywords }
    }
  },

  getAds: async () => {
    if (MOCK_MODE) return { data: mockAds }
    try {
      return await googleAdsFetch('/api/google-ads/ads')
    } catch {
      return { data: mockAds }
    }
  },

  getAssets: async (selection) => {
    if (MOCK_MODE) return { data: mockAssets }
    try {
      const scope = selection?.connectionId && selection?.id ? `${selection.connectionId}:${selection.id}` : 'current'
      return await cache.fetchGoogleAdsCache(`assets:${scope}`, (requestSignal) => googleAdsFetch('/api/google-ads/assets', { signal: requestSignal }))
    } catch {
      return { data: mockAssets }
    }
  },

  getBudgets: async () => {
    if (MOCK_MODE) return { data: mockBudgets }
    try {
      return await googleAdsFetch('/api/google-ads/budgets')
    } catch {
      return { data: mockBudgets }
    }
  },

  getReports: async (dateRange, selection) => {
    if (MOCK_MODE) return { data: mockReports }
    if (MOCK_MODE) return { data: mockReports }
    try {
      const qs = dateRange ? `?dateRange=${encodeURIComponent(dateRange)}` : ''
      const scope = selection?.connectionId && selection?.id ? `${selection.connectionId}:${selection.id}` : 'current'
      return await cache.fetchGoogleAdsCache(`reports:${scope}:${dateRange || ''}`, (requestSignal) => googleAdsFetch(`/api/google-ads/reports${qs}`, { signal: requestSignal }))
    } catch {
      return { data: mockReports }
    }
  },

  getLeads: async (selection, filters = {}, signal) => {
    if (!selection?.connectionId || !/^\d{10}$/.test(String(selection.id).replace(/-/g, ''))) throw new Error('Select an authorized Google Ads customer account.')
    const params = new URLSearchParams({ connectionId: selection.connectionId, customerId: String(selection.id).replace(/-/g, ''), page: String(filters.page || 1), pageSize: String(filters.pageSize || 25) })
    for (const key of ['search', 'status', 'campaignId', 'startDate', 'endDate']) if (filters[key]) params.set(key, filters[key])
    const key = `leads:${selection.connectionId}:${selection.id}:${params.toString()}`
    return cache.fetchGoogleAdsCache(key, (requestSignal) => googleAdsFetch(`/api/google-ads/leads?${params}`, { signal: requestSignal }), { signal })
  },

  getAllLeads: async (selection, filters = {}, signal) => {
    const pageSize = 100
    const leads = []
    let page = 1
    let response = null
    do {
      response = await googleAdsApi.getLeads(selection, { ...filters, page, pageSize }, signal)
      if (!Array.isArray(response?.leads)) throw new Error('Google Ads returned an invalid leads response.')
      leads.push(...response.leads)
      const pages = Math.max(Number(response.pagination?.pages) || 0, 1)
      page += 1
      if (page > pages) break
    } while (response?.pagination?.pages)
    return { ...response, leads, pagination: { ...(response?.pagination || {}), page: 1, pageSize, total: leads.length, pages: 1 } }
  },

  updateLead: async (selection, leadId, changes) => {
    if (!selection?.connectionId || !selection?.id) throw new Error('Select an authorized Google Ads customer account.')
    const params = new URLSearchParams({ connectionId: selection.connectionId, customerId: String(selection.id).replace(/-/g, '') })
    const result = await googleAdsFetch(`/api/google-ads/leads/${encodeURIComponent(leadId)}?${params}`, { method: 'PATCH', body: JSON.stringify(changes) })
    cache.invalidateGoogleAdsCache(`leads:${selection.connectionId}:${selection.id}:`)
    return result
  },
}

export { GOOGLE_ADS_BACKEND, MOCK_MODE }
