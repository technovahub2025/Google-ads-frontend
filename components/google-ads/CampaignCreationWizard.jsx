import { useEffect, useMemo, useState } from 'react'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { GOOGLE_ADS_DEVELOPMENT_MODE } from '../../config/googleAdsConfig.js'

const STEPS = [
  'Campaign goal', 'Campaign type', 'Campaign information', 'Budget', 'Bidding',
  'Locations', 'Languages', 'Ad schedule', 'Networks', 'Campaign settings', 'Review',
]
const TOTAL_STEPS = 12

const GOALS = [
  'Sales', 'Leads', 'Website traffic', 'Product and brand consideration',
  'Brand awareness and reach', 'App promotion', 'Local', 'No goal guidance',
]

const TYPES = ['Search', 'Performance Max', 'Display', 'Shopping', 'Video', 'App', 'Demand Gen']

const BIDDING_OPTIONS = {
  Search: [
    ['MAXIMIZE_CLICKS', 'Maximize clicks'], ['MAXIMIZE_CONVERSIONS', 'Maximize conversions'],
    ['MAXIMIZE_CONVERSION_VALUE', 'Maximize conversion value'], ['TARGET_CPA', 'Target CPA'],
    ['TARGET_ROAS', 'Target ROAS'], ['MANUAL_CPC', 'Manual CPC'],
  ],
  'Performance Max': [
    ['MAXIMIZE_CONVERSIONS', 'Maximize conversions'],
    ['MAXIMIZE_CONVERSION_VALUE', 'Maximize conversion value'],
  ],
  Display: [
    ['MAXIMIZE_CLICKS', 'Maximize clicks'], ['MAXIMIZE_CONVERSIONS', 'Maximize conversions'],
    ['TARGET_CPA', 'Target CPA'], ['TARGET_ROAS', 'Target ROAS'], ['MANUAL_CPC', 'Manual CPC'],
  ],
  Shopping: [
    ['MAXIMIZE_CLICKS', 'Maximize clicks'], ['MAXIMIZE_CONVERSION_VALUE', 'Maximize conversion value'],
    ['TARGET_ROAS', 'Target ROAS'], ['MANUAL_CPC', 'Manual CPC'],
  ],
  Video: [
    ['TARGET_CPV', 'Target CPV'], ['TARGET_CPM', 'Target CPM'],
  ],
  App: [
    ['MAXIMIZE_CONVERSIONS', 'Maximize conversions'], ['MAXIMIZE_CONVERSION_VALUE', 'Maximize conversion value'],
    ['TARGET_CPA', 'Target CPA'], ['TARGET_ROAS', 'Target ROAS'],
  ],
  'Demand Gen': [
    ['MAXIMIZE_CLICKS', 'Maximize clicks'], ['MAXIMIZE_CONVERSIONS', 'Maximize conversions'],
    ['TARGET_CPA', 'Target CPA'], ['TARGET_ROAS', 'Target ROAS'],
  ],
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const inputClass = 'w-full rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
const labelClass = 'mb-1 block font-label-sm text-label-sm text-on-surface-variant'

const makeInitialForm = () => ({
  goal: '',
  type: '',
  customerId: '',
  name: '',
  status: 'PAUSED',
  budgetAmount: '',
  biddingStrategy: '',
  targetCpa: '',
  targetRoas: '',
  targetBid: '',
  locations: [],
  locationBehavior: 'PRESENCE',
  languages: [],
  startDate: (() => {
    const today = new Date()
    const offset = today.getTimezoneOffset() * 60_000
    return new Date(today.getTime() - offset).toISOString().slice(0, 10)
  })(),
  endDate: '',
  days: WEEK_DAYS,
  startTime: '00:00',
  endTime: '23:59',
  searchPartners: false,
  displayNetwork: false,
  typeSettings: {},
})

function accountFields(account) {
  const customer = account.customer_client || account.customerClient || account
  return {
    id: String(customer.id ?? account.id ?? ''),
    name: customer.descriptive_name || customer.descriptiveName || customer.name || 'Google Ads customer',
    currency: customer.currency_code || customer.currencyCode || customer.currency || '',
    timeZone: customer.time_zone || customer.timeZone || '',
  }
}

function Field({ label, children }) {
  return <label className="block"><span className={labelClass}>{label}</span>{children}</label>
}

function CheckOption({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-surface-variant px-3 py-2 text-sm text-on-surface">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-primary" />
      {label}
    </label>
  )
}

export default function CampaignCreationWizard({ connectionId, accounts, accountsLoading, onClose, onCreated }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => ({
    ...makeInitialForm(),
    customerId: accounts.length ? accountFields(accounts[0]).id : '',
  }))
  const [locationInput, setLocationInput] = useState('')
  const [languageInput, setLanguageInput] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedAccount = useMemo(
    () => accounts.map(accountFields).find((account) => account.id === form.customerId),
    [accounts, form.customerId],
  )
  const biddingOptions = BIDDING_OPTIONS[form.type] || []
  const targetKind = ['TARGET_CPA', 'MAXIMIZE_CONVERSIONS'].includes(form.biddingStrategy)
    ? 'CPA'
    : ['TARGET_ROAS', 'MAXIMIZE_CONVERSION_VALUE'].includes(form.biddingStrategy)
      ? 'ROAS'
      : null
  const targetIsRequired = ['TARGET_CPA', 'TARGET_ROAS'].includes(form.biddingStrategy)

  useEffect(() => {
    if (!form.customerId && accounts.length > 0) {
      update('customerId', accountFields(accounts[0]).id)
    }
  }, [accounts, form.customerId])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const updateTypeSetting = (key, value) => setForm((current) => ({
    ...current,
    typeSettings: { ...current.typeSettings, [key]: value },
  }))

  const addItem = (key, value, clear) => {
    const normalized = value.trim()
    if (!normalized) return
    setForm((current) => current[key].some((item) => item.toLowerCase() === normalized.toLowerCase())
      ? current
      : { ...current, [key]: [...current[key], normalized] })
    clear('')
  }

  const validateStep = () => {
    if (step === 0 && !form.goal) return 'Choose a campaign goal to continue.'
    if (step === 1 && !form.type) return 'Choose a campaign type to continue.'
    if (step === 2) {
      if (accountsLoading) return 'Customer accounts are still loading.'
      if (!form.customerId) return 'Select a customer account.'
      if (!form.name.trim()) return 'Enter a campaign name.'
    }
    if (step === 3 && (!Number.isFinite(Number(form.budgetAmount)) || Number(form.budgetAmount) <= 0)) {
      return 'Enter a daily budget greater than zero.'
    }
    if (step === 4) {
      if (!form.biddingStrategy) return 'Choose a bidding strategy.'
      if (targetKind === 'CPA' && targetIsRequired && (!Number(form.targetCpa) || Number(form.targetCpa) <= 0)) return 'Enter a target CPA greater than zero.'
      if (targetKind === 'CPA' && form.targetCpa && Number(form.targetCpa) <= 0) return 'Target CPA must be greater than zero.'
      if (targetKind === 'ROAS' && targetIsRequired && (!Number(form.targetRoas) || Number(form.targetRoas) <= 0)) return 'Enter a target ROAS greater than zero.'
      if (targetKind === 'ROAS' && form.targetRoas && Number(form.targetRoas) <= 0) return 'Target ROAS must be greater than zero.'
      if (['TARGET_CPV', 'TARGET_CPM'].includes(form.biddingStrategy) && (!Number(form.targetBid) || Number(form.targetBid) <= 0)) return 'Enter a target bid greater than zero.'
    }
    if (step === 7) {
      if (!form.startDate || !form.startTime || !form.endTime || form.days.length === 0) return 'Choose a start date, time range, and at least one active day.'
      const today = makeInitialForm().startDate
      if (form.startDate < today) return 'The campaign start date cannot be in the past.'
      if (form.endDate && form.endDate < form.startDate) return 'The end date must be on or after the start date.'
      if (form.endTime <= form.startTime) return 'The end time must be later than the start time.'
    }
    if (step === 9 && form.type === 'Shopping' && !form.typeSettings.merchantId?.trim()) {
      return 'Enter the Merchant Center ID for this Shopping campaign.'
    }
    return ''
  }

  const goNext = () => {
    const issue = validateStep()
    if (issue) {
      setError(issue)
      return
    }
    setError('')
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const createCampaign = async () => {
    for (const index of [2, 3, 4, 7, 9]) {
      const issue = validateStepFor(index)
      if (issue) {
        setStep(index)
        setError(issue)
        return
      }
    }
    if (!connectionId && !GOOGLE_ADS_DEVELOPMENT_MODE) {
      setError('No Google Ads connection is available. Connect a Google Ads account and try again.')
      return
    }

    setIsSubmitting(true)
    setError('')
    const payload = {
      connectionId,
      customerId: form.customerId,
      name: form.name.trim(),
      status: form.status,
      budgetAmount: Number(form.budgetAmount),
      campaignType: form.type,
      goal: form.goal,
      budget: {
        amount: Number(form.budgetAmount),
        currencyCode: selectedAccount?.currency || null,
        period: 'DAILY',
        deliveryMethod: 'STANDARD',
      },
      bidding: {
        strategy: form.biddingStrategy,
        ...(form.targetCpa ? { targetCpa: Number(form.targetCpa) } : {}),
        ...(form.targetRoas ? { targetRoas: Number(form.targetRoas) / 100 } : {}),
        ...(form.targetBid ? { targetBid: Number(form.targetBid) } : {}),
      },
      targeting: {
        locations: form.locations,
        ...(['Search', 'Display', 'Shopping'].includes(form.type)
          ? { locationBehavior: form.locationBehavior }
          : {}),
        languages: form.languages,
      },
      schedule: {
        startDate: form.startDate,
        endDate: form.endDate || null,
        days: form.days,
        startTime: form.startTime,
        endTime: form.endTime,
      },
      networks: form.type === 'Search'
        ? { searchPartners: form.searchPartners, displayNetwork: form.displayNetwork }
        : null,
      campaignSettings: {
        type: form.type,
        ...form.typeSettings,
      },
    }

    try {
      const result = await googleAdsApi.createCampaign(payload)
      const campaignId = result?.campaignId || result?.data?.campaignId
      const created = result?.created === true || result?.data?.created === true || Boolean(campaignId)
      if (!result?.success || !created) {
        const backendMessage = result?.message || result?.data?.message
        throw new Error(backendMessage?.toLowerCase().includes('validated')
          ? 'The backend validated the request but does not create campaigns yet. No campaign was created.'
          : backendMessage || 'The backend did not confirm that a campaign was created.')
      }

      await onCreated(result?.data?.campaign || null, form.customerId)
      setForm(makeInitialForm())
      setStep(0)
      onClose(true)
    } catch (submitError) {
      setError(submitError.message || 'Campaign creation failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateStepFor = (targetStep) => {
    if (targetStep === 2) {
      if (accountsLoading) return 'Customer accounts are still loading.'
      if (!form.customerId) return 'Select a customer account.'
      if (!form.name.trim()) return 'Enter a campaign name.'
    }
    if (targetStep === 3 && (!Number.isFinite(Number(form.budgetAmount)) || Number(form.budgetAmount) <= 0)) return 'Enter a daily budget greater than zero.'
    if (targetStep === 4) {
      if (!form.biddingStrategy) return 'Choose a bidding strategy.'
        if (targetKind === 'CPA' && targetIsRequired && (!Number(form.targetCpa) || Number(form.targetCpa) <= 0)) return 'Enter a target CPA greater than zero.'
        if (targetKind === 'CPA' && form.targetCpa && Number(form.targetCpa) <= 0) return 'Target CPA must be greater than zero.'
        if (targetKind === 'ROAS' && targetIsRequired && (!Number(form.targetRoas) || Number(form.targetRoas) <= 0)) return 'Enter a target ROAS greater than zero.'
        if (targetKind === 'ROAS' && form.targetRoas && Number(form.targetRoas) <= 0) return 'Target ROAS must be greater than zero.'
        if (['TARGET_CPV', 'TARGET_CPM'].includes(form.biddingStrategy) && (!Number(form.targetBid) || Number(form.targetBid) <= 0)) return 'Enter a target bid greater than zero.'
    }
    if (targetStep === 7) {
      if (!form.startDate || !form.startTime || !form.endTime || form.days.length === 0) return 'Choose a start date, time range, and at least one active day.'
      const today = makeInitialForm().startDate
      if (form.startDate < today) return 'The campaign start date cannot be in the past.'
      if (form.endDate && form.endDate < form.startDate) return 'The end date must be on or after the start date.'
      if (form.endTime <= form.startTime) return 'The end time must be later than the start time.'
    }
    if (targetStep === 9 && form.type === 'Shopping' && !form.typeSettings.merchantId?.trim()) return 'Enter the Merchant Center ID for this Shopping campaign.'
    return ''
  }

  const renderStep = () => {
    if (step === 0) return (
      <div className="grid gap-3 sm:grid-cols-2">
        {GOALS.map((goal) => <CheckOption key={goal} label={goal} checked={form.goal === goal} onChange={() => update('goal', goal)} />)}
      </div>
    )
    if (step === 1) return (
      <div className="grid gap-3 sm:grid-cols-2">
        {TYPES.map((type) => <CheckOption key={type} label={type} checked={form.type === type} onChange={() => setForm((current) => ({ ...current, type, biddingStrategy: BIDDING_OPTIONS[type][0][0], typeSettings: {} }))} />)}
      </div>
    )
    if (step === 2) return (
      <div className="space-y-4">
        <Field label="Customer account">
          <select className={inputClass} value={form.customerId} disabled={accountsLoading} onChange={(event) => update('customerId', event.target.value)}>
            <option value="">{accountsLoading ? 'Loading customer accounts…' : 'Select a customer account'}</option>
            {accounts.map((raw) => {
              const account = accountFields(raw)
              return <option key={account.id} value={account.id}>{account.name} ({account.id}){account.currency ? ` · ${account.currency}` : ''}</option>
            })}
          </select>
        </Field>
        {!accountsLoading && accounts.length === 0 && <p className="text-sm text-error">No customer accounts were returned for this Google Ads connection.</p>}
        <Field label="Campaign name"><input className={inputClass} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Enter a campaign name" /></Field>
        <Field label="Campaign status">
          <select className={inputClass} value={form.status} onChange={(event) => update('status', event.target.value)}>
            <option value="PAUSED">Paused</option><option value="ENABLED">Enabled</option>
          </select>
        </Field>
      </div>
    )
    if (step === 3) return (
      <div className="space-y-4">
        <Field label={`Daily budget${selectedAccount?.currency ? ` (${selectedAccount.currency})` : ''}`}>
          <input type="number" min="0.01" step="0.01" className={inputClass} value={form.budgetAmount} onChange={(event) => update('budgetAmount', event.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Budget delivery"><select className={inputClass} value="STANDARD" disabled><option value="STANDARD">Standard</option></select></Field>
      </div>
    )
    if (step === 4) return (
      <div className="space-y-4">
        <Field label="Bidding strategy">
          <select className={inputClass} value={form.biddingStrategy} onChange={(event) => update('biddingStrategy', event.target.value)}>
            {biddingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {targetKind === 'CPA' && <Field label={`Target CPA${targetIsRequired ? '' : ' (optional)'}${selectedAccount?.currency ? ` (${selectedAccount.currency})` : ''}`}><input type="number" min="0.01" step="0.01" className={inputClass} value={form.targetCpa} onChange={(event) => update('targetCpa', event.target.value)} /></Field>}
        {targetKind === 'ROAS' && <Field label={`Target ROAS${targetIsRequired ? '' : ' (optional)'} (%)`}><input type="number" min="0.01" step="0.01" className={inputClass} value={form.targetRoas} onChange={(event) => update('targetRoas', event.target.value)} /></Field>}
        {['TARGET_CPV', 'TARGET_CPM'].includes(form.biddingStrategy) && <Field label={form.biddingStrategy === 'TARGET_CPV' ? 'Target CPV' : 'Target CPM'}><input type="number" min="0.01" step="0.01" className={inputClass} value={form.targetBid} onChange={(event) => update('targetBid', event.target.value)} /></Field>}
      </div>
    )
    if (step === 5) return (
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">Search for a country, region, or city and add the locations to target. Location names are entered from your campaign requirements.</p>
        <div className="flex gap-2">
          <input type="search" className={inputClass} value={locationInput} onChange={(event) => setLocationInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addItem('locations', locationInput, setLocationInput) } }} placeholder="Search or enter a country, region, or city" />
          <button type="button" className="rounded-lg bg-primary px-4 text-on-primary" onClick={() => addItem('locations', locationInput, setLocationInput)}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">{form.locations.map((location) => <button key={location} type="button" className="rounded-full bg-surface-container px-3 py-1 text-sm" onClick={() => update('locations', form.locations.filter((item) => item !== location))}>{location} ×</button>)}</div>
        {['Search', 'Display', 'Shopping'].includes(form.type) && <Field label="Location targeting behavior"><select className={inputClass} value={form.locationBehavior} onChange={(event) => update('locationBehavior', event.target.value)}><option value="PRESENCE">People in or regularly in your locations</option><option value="PRESENCE_OR_INTEREST">People in, regularly in, or interested in your locations</option></select></Field>}
      </div>
    )
    if (step === 6) return (
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">Add one or more language names. Leave empty to use Google Ads’ default language targeting.</p>
        <div className="flex gap-2"><input type="search" className={inputClass} value={languageInput} onChange={(event) => setLanguageInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addItem('languages', languageInput, setLanguageInput) } }} placeholder="Search or enter a language" /><button type="button" className="rounded-lg bg-primary px-4 text-on-primary" onClick={() => addItem('languages', languageInput, setLanguageInput)}>Add</button></div>
        <div className="flex flex-wrap gap-2">{form.languages.map((language) => <button key={language} type="button" className="rounded-full bg-surface-container px-3 py-1 text-sm" onClick={() => update('languages', form.languages.filter((item) => item !== language))}>{language} ×</button>)}</div>
      </div>
    )
    if (step === 7) return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Start date"><input type="date" className={inputClass} value={form.startDate} onChange={(event) => update('startDate', event.target.value)} /></Field><Field label="End date (optional)"><input type="date" className={inputClass} value={form.endDate} onChange={(event) => update('endDate', event.target.value)} /></Field></div>
        <div><span className={labelClass}>Days of the week</span><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{WEEK_DAYS.map((day) => <CheckOption key={day} label={day} checked={form.days.includes(day)} onChange={() => update('days', form.days.includes(day) ? form.days.filter((item) => item !== day) : [...form.days, day])} />)}</div></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Start time"><input type="time" className={inputClass} value={form.startTime} onChange={(event) => update('startTime', event.target.value)} /></Field><Field label="End time"><input type="time" className={inputClass} value={form.endTime} onChange={(event) => update('endTime', event.target.value)} /></Field></div>
      </div>
    )
    if (step === 8) return (
      <div className="space-y-3">
        {form.type === 'Search'
          ? <><CheckOption label="Include Google search partners" checked={form.searchPartners} onChange={(event) => update('searchPartners', event.target.checked)} /><CheckOption label="Include the Google Display Network" checked={form.displayNetwork} onChange={(event) => update('displayNetwork', event.target.checked)} /></>
          : <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">Network selection is managed by Google Ads for {form.type || 'this campaign type'} campaigns.</p>}
      </div>
    )
    if (step === 9) return renderTypeSettings()
    return renderReview()
  }

  const renderTypeSettings = () => {
    if (form.type === 'Search') return <p className="text-sm text-on-surface-variant">Search keyword and ad setup belongs to the later campaign setup flow. This step will not add keywords.</p>
    if (form.type === 'Performance Max') return <div className="space-y-3"><CheckOption label="Allow final URL expansion" checked={form.typeSettings.finalUrlExpansion !== false} onChange={(event) => updateTypeSetting('finalUrlExpansion', event.target.checked)} /><p className="text-sm text-on-surface-variant">Asset groups and assets must be configured in the Performance Max setup flow.</p></div>
    if (form.type === 'Display') return <CheckOption label="Use optimized targeting" checked={form.typeSettings.optimizedTargeting !== false} onChange={(event) => updateTypeSetting('optimizedTargeting', event.target.checked)} />
    if (form.type === 'Shopping') return <div className="space-y-4"><Field label="Merchant Center ID"><input className={inputClass} value={form.typeSettings.merchantId || ''} onChange={(event) => updateTypeSetting('merchantId', event.target.value)} placeholder="Enter the linked Merchant Center ID" /></Field><Field label="Feed label (optional)"><input className={inputClass} value={form.typeSettings.feedLabel || ''} onChange={(event) => updateTypeSetting('feedLabel', event.target.value)} /></Field></div>
    if (form.type === 'Video') return <div className="space-y-4"><Field label="Video ad format"><select className={inputClass} value={form.typeSettings.videoFormat || 'SKIPPABLE_IN_STREAM'} onChange={(event) => updateTypeSetting('videoFormat', event.target.value)}><option value="SKIPPABLE_IN_STREAM">Skippable in-stream</option><option value="NON_SKIPPABLE_IN_STREAM">Non-skippable in-stream</option><option value="IN_FEED">In-feed video</option><option value="BUMPER">Bumper</option></select></Field><Field label="YouTube video URL (optional at campaign level)"><input type="url" className={inputClass} value={form.typeSettings.videoUrl || ''} onChange={(event) => updateTypeSetting('videoUrl', event.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></Field></div>
    if (form.type === 'App') return <div className="grid gap-4 sm:grid-cols-2"><Field label="App store"><select className={inputClass} value={form.typeSettings.appStore || ''} onChange={(event) => updateTypeSetting('appStore', event.target.value)}><option value="">Select a store</option><option value="GOOGLE_APP_STORE">Google Play</option><option value="APPLE_APP_STORE">Apple App Store</option></select></Field><Field label="App ID"><input className={inputClass} value={form.typeSettings.appId || ''} onChange={(event) => updateTypeSetting('appId', event.target.value)} /></Field></div>
    return <div className="space-y-3"><p className="text-sm text-on-surface-variant">Choose the Demand Gen channels to include.</p><div className="grid gap-2 sm:grid-cols-3">{['YouTube', 'Discover', 'Gmail'].map((channel) => <CheckOption key={channel} label={channel} checked={(form.typeSettings.channels || []).includes(channel)} onChange={(event) => updateTypeSetting('channels', event.target.checked ? [...(form.typeSettings.channels || []), channel] : (form.typeSettings.channels || []).filter((item) => item !== channel))} />)}</div></div>
  }

  const renderReview = () => {
    const rows = [
      ['Customer', selectedAccount ? `${selectedAccount.name} (${selectedAccount.id})` : 'Not selected'],
      ['Campaign goal', form.goal], ['Campaign type', form.type], ['Campaign name', form.name],
      ['Status', form.status], ['Daily budget', `${selectedAccount?.currency ? `${selectedAccount.currency} ` : ''}${form.budgetAmount}`],
      ['Bidding strategy', biddingOptions.find(([value]) => value === form.biddingStrategy)?.[1] || form.biddingStrategy],
      ...(targetKind === 'CPA' ? [['Target CPA', form.targetCpa]] : []),
      ...(targetKind === 'ROAS' ? [['Target ROAS', `${form.targetRoas}%`]] : []),
      ['Locations', form.locations.join(', ') || 'Default location targeting'],
      ['Location behavior', form.locationBehavior], ['Languages', form.languages.join(', ') || 'Google Ads default'],
      ['Schedule', `${form.startDate} – ${form.endDate || 'No end date'} · ${form.days.join(', ')} · ${form.startTime}–${form.endTime}`],
      ['Network settings', form.type === 'Search' ? `Search partners: ${form.searchPartners ? 'On' : 'Off'}; Display: ${form.displayNetwork ? 'On' : 'Off'}` : `Managed for ${form.type}`],
      ['Campaign-specific settings', Object.keys(form.typeSettings).length ? JSON.stringify(form.typeSettings) : 'None'],
    ]
    return <dl className="divide-y divide-surface-variant rounded-lg border border-surface-variant">{rows.map(([label, value]) => <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-sm text-on-surface-variant">{label}</dt><dd className="break-words text-sm font-medium text-on-surface">{value || '—'}</dd></div>)}</dl>
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm" onClick={() => !isSubmitting && onClose(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="campaign-wizard-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-surface-variant bg-surface-container-lowest shadow-xl" onClick={(event) => event.stopPropagation()}>
        <header className="border-b border-surface-variant p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="font-label-sm text-label-sm text-on-surface-variant">Step {step + 1} of {TOTAL_STEPS} · Create is the final step</p><h2 id="campaign-wizard-title" className="mt-1 font-headline-md text-headline-md text-primary">Create a campaign</h2><p className="mt-1 text-sm text-on-surface-variant">{STEPS[step]}</p></div><button type="button" aria-label="Close campaign form" disabled={isSubmitting} onClick={() => onClose(false)} className="rounded-lg px-2 py-1 text-xl text-on-surface-variant hover:bg-surface-container">×</button></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${step === STEPS.length - 1 ? 100 : ((step + 1) / TOTAL_STEPS) * 100}%` }} /></div>
        </header>
        <div className="overflow-y-auto p-5 sm:p-6"><h3 className="mb-4 font-headline-sm text-headline-sm text-on-surface">{STEPS[step]}</h3>{renderStep()}{error && <p role="alert" className="mt-4 rounded-lg border border-error bg-error-container px-3 py-2 text-sm text-on-error">{error}</p>}</div>
        <footer className="flex items-center justify-between gap-3 border-t border-surface-variant p-4 sm:px-6">
          <button type="button" disabled={step === 0 || isSubmitting} onClick={() => { setError(''); setStep((current) => Math.max(current - 1, 0)) }} className="rounded-lg border border-surface-variant px-4 py-2 font-label-md text-label-md text-on-surface disabled:opacity-50">Back</button>
          {step < STEPS.length - 1
            ? <button type="button" onClick={goNext} className="rounded-lg bg-primary px-5 py-2 font-label-md text-label-md text-on-primary">Next</button>
            : <button type="button" disabled={isSubmitting} onClick={createCampaign} className="rounded-lg bg-primary px-5 py-2 font-label-md text-label-md text-on-primary disabled:opacity-60">{isSubmitting ? 'Creating…' : 'Create Campaign'}</button>}
        </footer>
      </section>
    </div>
  )
}
