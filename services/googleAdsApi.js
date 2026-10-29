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

async function googleAdsFetch(endpoint, options = {}) {
  if (!GOOGLE_ADS_BACKEND) {
    throw new Error('Set VITE_GOOGLE_ADS_API_URL to the Google Ads backend URL.')
  }

  const url = `${GOOGLE_ADS_BACKEND}${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
    if (MOCK_MODE) return { success: true, mock: true, authUrl: null, message: 'Mock mode is enabled; no Google OAuth request was made.' }
    const data = await googleAdsFetch('/api/google-ads/auth')
    return data
  },

  checkConnection: async () => {
    if (MOCK_MODE) return { connected: true, account: MOCK_ACCOUNT, mock: true }
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
    if (!connectionId) throw new Error('A Google Ads connection is required to load customer accounts.')
    return googleAdsFetch(`/api/google-ads/customer-accounts?connectionId=${encodeURIComponent(connectionId)}`)
  },

  getCustomerCampaigns: async (connectionId, customerId) => {
    if (!connectionId || !customerId) {
      throw new Error('A Google Ads connection and customer account are required to load campaigns.')
    }
    return googleAdsFetch(`/api/google-ads/campaigns?connectionId=${encodeURIComponent(connectionId)}&customerId=${encodeURIComponent(customerId)}`)
  },

  createCampaign: async (campaignConfiguration) => {
    if (MOCK_MODE) throw new Error('Campaign creation requires a live Google Ads connection.')
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
