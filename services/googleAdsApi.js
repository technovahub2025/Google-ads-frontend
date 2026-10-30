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

export function getNexionRole() {
  try {
    for (const key of ['user', 'nexionUser', 'currentUser']) {
      const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key)
      if (raw) {
        const user = JSON.parse(raw)
        if (user.role) return String(user.role).toLowerCase()
      }
    }
    const key = import.meta.env.VITE_TOKEN_KEY || 'authToken'
    const token = window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || window.localStorage.getItem('token') || window.sessionStorage.getItem('token')
    const payload = token?.split('.')[1]
    if (payload) return String(JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role || '').toLowerCase()
  } catch { /* role is only used to shape the UI; backend authorization remains authoritative */ }
  return ''
}

async function googleAdsFetch(endpoint, options = {}) {
  if (!GOOGLE_ADS_BACKEND) {
    throw new Error('Set VITE_GOOGLE_ADS_API_URL to the Google Ads backend URL.')
  }

  const url = `${GOOGLE_ADS_BACKEND}${endpoint}`
  const storageKey = import.meta.env.VITE_TOKEN_KEY || 'authToken'
  const token = window.localStorage.getItem(storageKey) || window.sessionStorage.getItem(storageKey) || window.localStorage.getItem('authToken') || window.localStorage.getItem('token') || window.sessionStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, {
    ...options,
    headers,
  })

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
    throw error
  }

  return data
}

export const googleAdsApi = {
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
    return { data: mockOverviewStats }
  },

  getAccounts: async () => {
    if (MOCK_MODE) return { data: mockAccounts }
    try {
      const data = await googleAdsFetch('/api/google-ads/accounts')
      return data
    } catch {
      return { data: mockAccounts }
    }
  },

  getCampaigns: async () => {
    if (MOCK_MODE) return { data: mockCampaigns }
    try {
      const data = await googleAdsFetch('/api/google-ads/campaigns')
      return data
    } catch {
      return { data: mockCampaigns }
    }
  },

  getCustomerAccounts: async (connectionId) => {
    if (MOCK_MODE) return { success: true, accounts: mockAccounts }
    if (!connectionId) throw new Error('A Google Ads connection is required to load customer accounts.')
    return googleAdsFetch(`/api/google-ads/customer-accounts?connectionId=${encodeURIComponent(connectionId)}`)
  },

  getCustomerAssignments: async () => googleAdsFetch('/api/google-ads/customer-assignments'),

  assignCustomerAccount: async ({ userId, connectionId, customerId }) => googleAdsFetch('/api/google-ads/customer-assignments', {
    method: 'POST', body: JSON.stringify({ userId, connectionId, customerId }),
  }),

  getCustomerCampaigns: async (connectionId, customerId) => {
    if (MOCK_MODE) return { success: true, campaigns: mockCampaigns }
    if (!connectionId || !customerId) {
      throw new Error('A Google Ads connection and customer account are required to load campaigns.')
    }
    return googleAdsFetch(`/api/google-ads/campaigns?connectionId=${encodeURIComponent(connectionId)}&customerId=${encodeURIComponent(customerId)}`)
  },

  createCampaign: async (campaignConfiguration) => {
    if (MOCK_MODE) {
      const id = `demo-campaign-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const campaign = {
        id,
        name: campaignConfiguration.name,
        status: String(campaignConfiguration.status || 'PAUSED').toLowerCase(),
        type: campaignConfiguration.campaignType,
        biddingStrategy: campaignConfiguration.bidding?.strategy || '—',
        dailyBudget: Number(campaignConfiguration.budget?.amount ?? campaignConfiguration.budgetAmount ?? 0),
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        cost: 0,
        goal: campaignConfiguration.goal,
        targetCpa: campaignConfiguration.bidding?.targetCpa ?? null,
        targetRoas: campaignConfiguration.bidding?.targetRoas ?? null,
        locations: campaignConfiguration.targeting?.locations || [],
        languages: campaignConfiguration.targeting?.languages || [],
        schedule: campaignConfiguration.schedule || null,
        networks: campaignConfiguration.networks || null,
        campaignSettings: campaignConfiguration.campaignSettings || {},
      }
      return { success: true, created: true, campaignId: id, data: { created: true, campaignId: id, campaign } }
    }
    return googleAdsFetch('/api/google-ads/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignConfiguration),
    })
  },

  getAdGroups: async () => {
    if (MOCK_MODE) return { data: mockAdGroups }
    try {
      const data = await googleAdsFetch('/api/google-ads/ad-groups')
      return data
    } catch {
      return { data: mockAdGroups }
    }
  },

  getKeywords: async () => {
    if (MOCK_MODE) return { data: mockKeywords }
    try {
      const data = await googleAdsFetch('/api/google-ads/keywords')
      return data
    } catch {
      return { data: mockKeywords }
    }
  },

  getAds: async () => {
    if (MOCK_MODE) return { data: mockAds }
    try {
      const data = await googleAdsFetch('/api/google-ads/ads')
      return data
    } catch {
      return { data: mockAds }
    }
  },

  getAssets: async () => {
    if (MOCK_MODE) return { data: mockAssets }
    try {
      const data = await googleAdsFetch('/api/google-ads/assets')
      return data
    } catch {
      return { data: mockAssets }
    }
  },

  getBudgets: async () => {
    if (MOCK_MODE) return { data: mockBudgets }
    try {
      const data = await googleAdsFetch('/api/google-ads/budgets')
      return data
    } catch {
      return { data: mockBudgets }
    }
  },

  getReports: async (dateRange) => {
    if (MOCK_MODE) return { data: mockReports }
    try {
      const qs = dateRange ? `?dateRange=${encodeURIComponent(dateRange)}` : ''
      const data = await googleAdsFetch(`/api/google-ads/reports${qs}`)
      return data
    } catch {
      return { data: mockReports }
    }
  },
}

export { GOOGLE_ADS_BACKEND, MOCK_MODE }
