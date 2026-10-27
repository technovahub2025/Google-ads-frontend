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

const MOCK_MODE = import.meta.env.DEV && import.meta.env.VITE_MOCK_INTEGRATIONS === 'true'

const MOCK_ACCOUNT = { id: 'demo-google-ads-account', name: 'Demo Google Ads Account', customerId: '123-456-7890' }

const GOOGLE_ADS_BACKEND =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_ADS_API_URL) ||
  'http://localhost:8000'

async function googleAdsFetch(endpoint, options = {}) {
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
    throw new Error(message)
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
      const data = await googleAdsFetch('/api/google-ads/status')
      return data
    } catch {
      const stored = localStorage.getItem('nexion_google_ads_connected')
      return {
        connected: stored === 'true',
        account: JSON.parse(localStorage.getItem('nexion_google_ads_account') || 'null'),
      }
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
