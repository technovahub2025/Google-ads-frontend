const env = import.meta.env

// TEMPORARY: switch to false to re-enable the real Google Ads connection flow.
export const GOOGLE_ADS_DEVELOPMENT_MODE = true
export const MOCK_MODE = GOOGLE_ADS_DEVELOPMENT_MODE
export const GOOGLE_ADS_BACKEND = env.VITE_GOOGLE_ADS_API_URL || ''

export const MOCK_ACCOUNT = {
  id: env.VITE_MOCK_ACCOUNT_ID || '',
  name: env.VITE_MOCK_ACCOUNT_NAME || '',
  customerId: env.VITE_MOCK_CUSTOMER_ID || '',
}
