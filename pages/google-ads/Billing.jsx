import { useCallback, useEffect, useRef, useState } from 'react'
import { getNexionSession, googleAdsApi } from '../../services/googleAdsApi.js'
import * as cacheModule from '../../services/googleAdsCache.js'
const readGoogleAdsCache = (...args) => cacheModule.readGoogleAdsCache?.(...args)
const writeGoogleAdsCache = (...args) => cacheModule.writeGoogleAdsCache?.(...args)

const buttonClass = 'ads-button'
const cardClass = 'ads-card ads-card-padding'
const cardTitleClass = 'ads-section-title'
const detailLabelClass = 'text-xs font-medium leading-5 text-slate-600 sm:text-sm'
const detailValueClass = 'mt-1 break-words text-sm font-semibold leading-6 text-on-surface sm:text-base'
const guidanceClass = 'ads-description'
const billingSummaryUrl = 'https://ads.google.com/aw/billing/summary'
const billingHelpUrl = 'https://support.google.com/google-ads/answer/2497582?hl=en'
const googleAdsAndroidUrl = 'https://play.google.com/store/apps/details?id=com.google.android.apps.adwords'

const billingErrors = new Map([
  ['BILLING_ACCOUNT_NOT_ASSIGNED', 'Ask your Super Admin to assign a Google Ads account to your NEXION user.'],
  ['BILLING_CONNECTION_DISCONNECTED', 'Your assigned Google Ads account is disconnected. Ask your Super Admin to reconnect it.'],
  ['BILLING_AUTHORIZATION_REQUIRED', 'Google Ads authorization has expired or been revoked. Ask your Super Admin to reconnect the account.'],
  ['BILLING_ACCOUNT_ACCESS_DENIED', 'Google could not verify access to the assigned account. Ask your Super Admin to check its Google Ads permissions.'],
])

const billingError = (error) => {
  if (error.status === 401) return 'Sign in to NEXION again to view Google Ads billing.'
  if (error.status === 403 && !billingErrors.has(error.code)) return 'You do not have access to Google Ads billing in NEXION.'
  return billingErrors.get(error.code) || 'Google Ads billing is temporarily unavailable. Try again.'
}

function PaymentGuidance({ arrangement, customerId }) {
  switch (arrangement) {
    case 'prepaid':
      return (
        <section aria-labelledby="billing-add-funds" className="space-y-3 rounded-lg border border-primary/20 bg-secondary-container/60 p-4 text-sm leading-6 text-slate-700 sm:p-5 [&>p]:max-w-[78ch]">
          <h3 id="billing-add-funds" className="text-base font-semibold text-blue-950">Prepaid billing</h3>
          <p>Add Funds opens Google Ads Billing Summary in a new tab. Sign in if prompted. Use the profile menu in Google Ads to switch accounts if needed, and verify Customer ID <strong>{customerId}</strong> before paying.</p>
          <p>In Google Ads, go to Billing → Summary and select Add funds. All payments go directly to Google.</p>
          <p>For UPI in India, use the Google Ads Android app and choose UPI if it appears under Billing → Summary → Make a payment. Google determines eligibility, which includes prepaid billing in INR, an Indian billing address, and a UPI-enabled Indian bank account.</p>
          <p>Check Available Funds in Billing → Summary and use Billing Activity to see whether Google has posted your payment.</p>
          <div className="flex flex-col gap-2 border-t border-primary/20 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            <a href={billingSummaryUrl} target="_blank" rel="noopener noreferrer" className={`${buttonClass} ads-button--primary`}>
              {/* Lucide Circle Plus (ISC) */}
              <svg aria-hidden="true" className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8M12 8v8" />
              </svg>
              Add Funds
            </a>
            <a href={billingHelpUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>Google Ads Billing Help</a>
            <a href={googleAdsAndroidUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>Google Ads Android app for UPI</a>
          </div>
        </section>
      )
    case 'monthly_invoicing':
      return (
        <>
          <p className={guidanceClass}><strong>Monthly invoicing.</strong> Google issues invoices for advertising costs. Open Google Ads to check invoices and payment instructions.</p>
          <p className={guidanceClass}>Google Ads shows invoice amounts, due dates, and payment history.</p>
        </>
      )
    case 'automatic_payments':
      return <p className={guidanceClass}><strong>Automatic payments.</strong> Google charges your payment method after costs accrue. Open Billing → Settings in Google Ads to review or update your payment method.</p>
    default:
      return <p className={guidanceClass}>Your payment setting is unverified. Check Billing → Settings in Google Ads to see which arrangement applies to your account.</p>
  }
}

export default function Billing() {
  const cacheKey = `page:billing:${(typeof getNexionSession === 'function' ? getNexionSession()?.userId : null) || 'anonymous'}`
  const [state, setState] = useState(() => readGoogleAdsCache(cacheKey) || null)
  const request = useRef(null)

  const load = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    try {
      const billing = await googleAdsApi.getBilling(controller.signal)
      if (!controller.signal.aborted) { const snapshot = { billing }; writeGoogleAdsCache(cacheKey, snapshot); setState(snapshot) }
    } catch (error) {
      if (!controller.signal.aborted) setState({ error: billingError(error) })
    } finally {
      if (request.current === controller) request.current = null
    }
  }, [])

  useEffect(() => {
    load()
    return () => request.current?.abort()
  }, [load])

  const billing = state?.billing

  return (
    <main className="ads-page">
      <div className="ads-content ads-stack">
        <header className="ads-toolbar">
          <div className="min-w-0">
            <h1 className="ads-page-title">Google Ads Billing</h1>
            <p className={`mt-1 ${guidanceClass}`}>You pay Google directly for your advertising.</p>
          </div>
          <button type="button" className={`${buttonClass} shrink-0`} onClick={() => load()} disabled={!state}>Refresh</button>
        </header>

        {!state && <p role="status" className={`${cardClass} ${guidanceClass}`}>Verifying your assigned Google Ads account…</p>}
        {state?.error && <p role="alert" className="rounded-lg border border-error/20 bg-error-container p-4 text-sm leading-6 text-error">{state.error}</p>}

        {billing && (
          <>
            <section aria-labelledby="billing-account" className={cardClass}>
              <h2 id="billing-account" className={cardTitleClass}>Connected account</h2>
              <dl className="mt-4 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-4 gap-y-3 border-t border-surface-variant pt-4 sm:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] sm:gap-x-6">
                <div className="col-span-2 min-w-0 sm:col-span-1"><dt className={detailLabelClass}>Google Ads account</dt><dd className={detailValueClass}>{billing.account.name || 'Assigned Google Ads account'}</dd></div>
                <div className="min-w-0"><dt className={detailLabelClass}>Customer ID</dt><dd className={`${detailValueClass} font-mono`}>{billing.account.customerId}</dd></div>
                <div className="min-w-0"><dt className={detailLabelClass}>Currency</dt><dd className={detailValueClass}>{billing.account.currency || 'Unavailable'}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="billing-payment" className={`${cardClass} space-y-4`}>
              <h2 id="billing-payment" className={cardTitleClass}>Payment setting</h2>
              <PaymentGuidance arrangement={billing.paymentArrangement} customerId={billing.account.customerId} />
            </section>
          </>
        )}
      </div>
    </main>
  )
}
