const env = import.meta.env

export const MOCK_MODE = env.DEV && env.VITE_MOCK_INTEGRATIONS === 'true'
export const GOOGLE_ADS_BACKEND = env.VITE_GOOGLE_ADS_API_URL || ''
export const NEXION_USER_ID = env.VITE_NEXION_USER_ID || ''

export const MOCK_ACCOUNT = {
  id: env.VITE_MOCK_ACCOUNT_ID || '',
  name: env.VITE_MOCK_ACCOUNT_NAME || '',
  customerId: env.VITE_MOCK_CUSTOMER_ID || '',
}
