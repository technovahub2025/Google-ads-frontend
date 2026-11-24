import { useEffect, useRef, useState } from 'react'
import { getNexionSession, googleAdsApi } from '../../services/googleAdsApi.js'
import {
  FONTS, OBJECTIVES, STRATEGIES, STEPS, TEXT_FIELDS, campaignDraft, campaignPayload,
  goalEligible, groupDraft, splitLines, stepErrors,
} from '../../utils/performanceMax.js'
import { clearPerformanceMaxDraft, loadPerformanceMaxDraft, performanceMaxDraftKey, savePerformanceMaxDraft } from '../../utils/performanceMaxDraft.js'
import { AssetGroupFields, Field, FieldError, RequiredMark, ImagePreviews, VideoPreviews, buttonClass, inputClass, panelClass } from './PerformanceMaxFields.jsx'

import logo from './nexion-logo.png'
import './PerformanceMaxWizard.css'

const humanize = (value) => String(value || '').toLowerCase().replaceAll('_', ' ')
const toggle = (values, value) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
const political = {
  DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING: 'Does not contain EU political advertising',
  CONTAINS_EU_POLITICAL_ADVERTISING: 'Contains EU political advertising',
}
const locationModes = {
  PRESENCE_OR_INTEREST: 'People in, regularly in, or interested in the selected locations',
  PRESENCE: 'People in or regularly in the selected locations',
}

const stepDescriptions = [
  'Choose what you want this campaign to achieve.',
  'Set the campaign name, where ads can show, and when the campaign runs.',
  'Set your daily budget and choose what Smart Bidding should optimize for.',
  'Choose which conversions Google Ads should use for bidding.',
  'Add the business identity and creative assets Google Ads can combine into ads.',
  'Help Google Ads identify likely customers for each asset group.',
  'Review your declaration and optional URL and brand settings.',
  'Check your campaign details and edit any section before publishing.',
  'Confirm the campaign and Google Ads account.',
]

function Stepper({ step, created }) {
  const rail = useRef(null)
  const current = useRef(null)
  useEffect(() => {
    const viewport = rail.current
    const item = current.current
    if (!viewport || !item) return
    const centerCurrentStep = () => {
      if (viewport.scrollWidth > viewport.clientWidth) {
        viewport.scrollLeft = item.offsetLeft - (viewport.clientWidth - item.offsetWidth) / 2
      }
    }
    centerCurrentStep()
    const observer = new ResizeObserver(centerCurrentStep)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [step])
  return <nav className="pmax-stepper" aria-label="Campaign setup progress">
    <ol ref={rail}>
      {STEPS.map((label, index) => {
        const done = index < step || Boolean(created)
        return <li key={label} ref={index === step ? current : undefined} aria-current={index === step ? 'step' : undefined} data-complete={done}>
          <span className="pmax-step-marker" aria-hidden="true">{done ? '✓' : index + 1}</span>
          <span>{label}</span>
          {done && <span className="sr-only"> completed</span>}
        </li>
      })}
    </ol>
  </nav>
}

function Choice({ name, value, label, hint, selected, onChange }) {
  return <label className="pmax-choice" data-selected={value === selected}>
    <input type="radio" name={name} checked={value === selected} onChange={() => onChange(value)} />
    <span><strong>{label}</strong>{hint && <span className="pmax-hint">{hint}</span>}</span>
  </label>
}

function LocationPicker({ selected, onChange, account }) {
  const [term, setTerm] = useState('')
  const [lookup, setLookup] = useState(null)
  const search = useRef(null)
  useEffect(() => () => search.current?.abort(), [])

  function changeTerm(value) {
    search.current?.abort()
    setTerm(value)
    setLookup(null)
  }

  async function submit() {
    const query = term.trim()
    if (query.length < 2 || lookup?.loading) return
    search.current?.abort()
    const request = new AbortController()
    search.current = request
    setLookup({ loading: true, query })
    try {
      const options = await googleAdsApi.campaignCreationOptions(account, 'locations', { q: query, signal: request.signal })
      if (!request.signal.aborted) setLookup({ options, query })
    } catch (error) {
      if (!request.signal.aborted) setLookup({ error: error.message, query })
    }
  }
  const options = lookup?.options?.filter((item) => !selected.some((location) => location.id === item.id))
  return <div className="pmax-stack pmax-stack-compact">
    <div className="pmax-search-row"><label className="pmax-field">
      <span className="pmax-label">Locations</span>
      <input placeholder="Search for a country, region or city" maxLength={80} value={term} onChange={(event) => changeTerm(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit() } }} className={inputClass} />
    </label>
    <button type="button" className={buttonClass} disabled={term.trim().length < 2 || lookup?.loading} onClick={submit}>Search locations</button></div>
    {lookup?.loading && <p role="status">Searching Google Ads for {lookup.query}…</p>}
    <FieldError message={lookup?.error} />
    {options?.length === 0 && <p role="status" className="pmax-hint">{lookup.options.length ? 'All locations found are already selected.' : `No locations found for ${lookup.query}. Try a different search.`}</p>}
    {options?.length > 0 && <div className="pmax-result-list" aria-label="Location search results">
      {options.map((item) => <button type="button" key={item.id} className="pmax-result" onClick={() => onChange([...selected, item])}>{item.name}{item.type && <> <small>({item.type})</small></>}</button>)}
    </div>}
    <div className="pmax-inline">
      {selected.map((item) => <button type="button" key={item.id} className="pmax-chip" aria-label={'Remove ' + item.name} onClick={() => onChange(selected.filter((location) => location.id !== item.id))}>{item.name} ×</button>)}
    </div>
    {!selected.length && <p className="pmax-hint">No location criteria selected. All locations are eligible.</p>}
  </div>
}

function CatalogState({ state, label, retry }) {
  if (state?.error) return <div className="pmax-stack pmax-stack-compact">
    <FieldError message={state.error} /><button type="button" onClick={retry} className={buttonClass}>Reload {label}</button>
  </div>
  return !state?.data && <p role="status">Loading {label} from Google Ads…</p>
}

function ConversionGoals({ catalog, draft, change, error, retry }) {
  const data = catalog?.data
  if (!data) return <CatalogState state={catalog} label="conversion goals" retry={retry} />
  const preferred = (goal) => draft.objective === 'SALES' ? /PURCHASE|ADD_TO_CART|BEGIN_CHECKOUT/.test(goal.category)
    : draft.objective === 'LEADS' && /LEAD|CONTACT|SIGNUP|PHONE_CALL/.test(goal.category)
  const goalList = [...data.goals].sort((a, b) => Number(preferred(b)) - Number(preferred(a)))
  const actionsByObjective = [...data.actions].sort((a, b) => Number(preferred(b)) - Number(preferred(a)))
  return <div className="pmax-stack">
    <section className={panelClass}>
      <h5>Goal selection <RequiredMark /></h5>
      <div className="pmax-choices">
        <Choice name="goalMode" value="ACCOUNT" label="Use account goals" hint="Keep the customer account’s default goals." selected={draft.goalMode} onChange={(value) => change('goalMode', value)} />
        <Choice name="goalMode" value="CAMPAIGN" label="Choose campaign goals" hint="Select the category and source of the primary actions this campaign should optimize for." selected={draft.goalMode} onChange={(value) => change('goalMode', value)} />
        {data.canSelectActions && <Choice name="goalMode" value="ACTIONS" label="Choose individual conversion actions" hint="Use only these actions for bidding. Selecting a secondary action makes it biddable in this campaign." selected={draft.goalMode} onChange={(value) => change('goalMode', value)} />}
      </div>
      <FieldError message={error} />
    </section>
    {draft.goalMode === 'ACTIONS' && <fieldset className={panelClass}>
      <legend className="font-medium">Conversion actions</legend>
      {!actionsByObjective.some((action) => action.status === 'ENABLED') && <p>Enable at least one conversion action in Google Ads.</p>}
      {actionsByObjective.map((action) => <label key={action.id} className="pmax-check-row">
        <input type="checkbox" checked={draft.conversionActions.includes(action.id)}
          disabled={action.status !== 'ENABLED' || (draft.conversionActions.length >= 100 && !draft.conversionActions.includes(action.id))}
          onChange={() => change('conversionActions', toggle(draft.conversionActions, action.id))} />
        <span>{action.name} &#183; {humanize(action.status)} &#183; {action.primary ? 'primary' : 'secondary'}{preferred(action) && ' \u00b7 suggested'}</span>
      </label>)}
    </fieldset>}
    {draft.goalMode !== 'ACTIONS' && !goalList.some((goal) => goalEligible(data, goal.key)) && <p role="status" className="text-sm">No eligible primary conversion actions are available. In Google Ads, set up conversion tracking and mark at least one enabled action as primary.</p>}
    {draft.goalMode !== 'ACTIONS' && <div className="pmax-stack pmax-stack-compact">
      {goalList.map((goal) => {
        const actions = data.actions.filter((action) => action.goalKey === goal.key)
        return <div key={goal.key} className="pmax-card pmax-goal-card">
          <label className="pmax-check-row">
            <input type="checkbox" disabled={draft.goalMode === 'ACCOUNT' || !goalEligible(data, goal.key)}
              checked={draft.goalMode === 'ACCOUNT' ? Boolean(goal.biddable) : draft.goals.includes(goal.key)}
              onChange={() => change('goals', toggle(draft.goals, goal.key))} />
            <span className="capitalize">{humanize(goal.category)} · {humanize(goal.origin)}</span>
            {preferred(goal) && <span className="pmax-count">Suggested for {OBJECTIVES[draft.objective][0].toLowerCase()}</span>}
          </label>
          {actions.map((action) => <p key={action.id} className="ml-6">{action.name} · {humanize(action.status)} · {action.primary ? 'primary' : 'secondary'}</p>)}
          {!actions.length && <p className="ml-6">No conversion actions available for this goal.</p>}
        </div>
      })}
    </div>}
  </div>
}

function AudienceSignals({ catalog, draft, updateGroup, errors, retry }) {
  const data = catalog?.data
  const hasUnavailableSources = Boolean(data?.unavailable.length)
  const segments = new Map()
  for (const option of data?.options || []) {
    if (option.type !== 'audiences') segments.set(option.category, [...(segments.get(option.category) || []), option])
  }
  return <div className="pmax-stack">
    <aside className="pmax-notice"><strong>Audience signals are suggestions</strong><p>Google Ads can reach people outside these audiences.</p></aside>
    <CatalogState state={catalog} label="audience options" retry={retry} />
    {hasUnavailableSources && <div role="status" className="space-y-2 text-sm">
      <p>{data.options.length ? 'Some audience sources are unavailable for this account.' : 'Google Ads could not load any audience options. You can still enter search themes.'}</p>
      <button type="button" className={buttonClass} onClick={retry}>Reload audience options</button>
    </div>}
    {data && !data.options.length && !hasUnavailableSources && <p role="status" className="pmax-hint">Google Ads returned no eligible audience options for this account. You can still enter search themes.</p>}
    {draft.groups.map((group) => <section key={group.key} className={panelClass}>
      <h5>{group.name}</h5>
      {data?.options.some((item) => item.type === 'audiences') && <label className="pmax-field">
        <span className="pmax-label">Saved audience</span>
        <select value={group.audience} onChange={(event) => {
          const value = event.target.value
          updateGroup(group.key, 'audience', value)
          if (value) updateGroup(group.key, 'segments', [])
        }} className={inputClass}>
          <option value="">No saved audience</option>
          {data.options.filter((item) => item.type === 'audiences').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>}
      {!group.audience && segments.size > 0 && <div className="pmax-grid">
        {[...segments].map(([category, items]) => <fieldset key={category} className="pmax-segments">
          <legend>{category}</legend>
          <div className="pmax-segment-options">
            {items.map((item) => <label key={item.id} className="pmax-check-row">
              <input type="checkbox" checked={group.segments.includes(item.id)} disabled={group.segments.length >= 50 && !group.segments.includes(item.id)}
                onChange={() => updateGroup(group.key, 'segments', toggle(group.segments, item.id))} />
              <span>{item.name}</span>
            </label>)}
          </div>
        </fieldset>)}
      </div>}
      <Field label="Search themes (optional)" value={group.themes} onChange={(value) => updateGroup(group.key, 'themes', value)} error={errors[group.key + '.themes']} hint="Words or phrases customers might search for. Up to 50 lines and 80 characters per theme." multiline rows={3} />
    </section>)}
  </div>
}

function Review({ draft, catalogs, account, navigate }) {
  const goalList = draft.goalMode === 'ACTIONS' ? [] : catalogs.goals?.goals.filter((goal) => draft.goalMode === 'ACCOUNT' ? goal.biddable : draft.goals.includes(goal.key)) || []
  const audienceNames = new Map(catalogs.audiences?.options.map((item) => [item.id, item.name]))
  const languageNames = new Map(catalogs.languages?.map((item) => [item.id, item.name]))
  const money = (value) => value + ' ' + account.currency
  const summary = [
    [0, 'Objective', [['Campaign type', 'Performance Max'], ['Objective', OBJECTIVES[draft.objective]?.[0]]]],
    [1, 'Campaign settings', [['Name', draft.name], ['Locations', draft.locations.map((item) => item.name).join(', ') || 'All locations'], ['Location matching', locationModes[draft.locationMode]], ['Languages', draft.languages.map((id) => languageNames.get(id) || id).join(', ') || 'All languages'], ['Start date', draft.startDate || 'Today in the account time zone'], ['End date', draft.endDate || 'No end date']]],
    [2, 'Budget and bidding', [['Daily budget', money(draft.budgetAmount)], ['Bidding', STRATEGIES[draft.biddingStrategy][0]],
      ...(draft.biddingStrategy === 'MAXIMIZE_CONVERSIONS' && draft.targetCpa ? [['Target CPA', money(draft.targetCpa)]] : []),
      ...(draft.biddingStrategy === 'MAXIMIZE_CONVERSION_VALUE' && draft.targetRoas ? [['Target ROAS', draft.targetRoas + '%']] : [])]],
    [3, 'Conversion goals', [['Goal scope', ({ ACCOUNT: 'Account defaults', CAMPAIGN: 'Campaign-specific', ACTIONS: 'Individual actions' })[draft.goalMode]],
      ...(draft.goalMode === 'ACTIONS' ? [['Actions', catalogs.goals?.actions.filter((action) => draft.conversionActions.includes(action.id)).map((action) => action.name).join(', ')]] : []),
      ...goalList.map((goal) => [humanize(goal.category) + ' · ' + humanize(goal.origin), catalogs.goals.actions.filter((action) => action.goalKey === goal.key && action.status === 'ENABLED' && action.primary).map((action) => action.name).join(', ') || 'No enabled primary actions'])]],
    [6, 'Additional settings', [['Final URL expansion', draft.urlExpansion ? 'On' : 'Off'], ['Final URL suffix', draft.finalUrlSuffix || 'None'], ['EU political advertising', political[draft.euPoliticalAdvertising]], ['Brand guidelines', 'Enabled'], ['Brand colors', draft.mainColor ? draft.mainColor + ' / ' + draft.accentColor : 'Google Ads defaults'], ['Brand font', draft.fontFamily || 'Google Ads default']]],
  ]
  return <div className="pmax-review">
    {summary.map(([step, section, rows]) => <section key={step} className={panelClass}>
      <div className="pmax-card-heading"><h5>{section}</h5><button className="pmax-text-button" type="button" onClick={() => navigate(step)} aria-label={'Edit ' + section}>Edit</button></div>
      <dl className="pmax-review-data">{rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
    </section>)}
    <section className="pmax-card pmax-review-assets">
      <div className="pmax-card-heading"><h5>Business identity and asset groups ({draft.groups.length})</h5><button type="button" className="pmax-text-button" onClick={() => navigate(4)}>Edit assets</button></div>
      <p className="text-sm">{draft.businessName}</p>
      <ImagePreviews images={[...draft.logos, ...draft.landscapeLogos]} />
      {draft.groups.map((group) => <details key={group.key} className="pmax-review-group" open={draft.groups.length === 1}>
        <summary className="cursor-pointer font-medium">{group.name}</summary>
        <p className="break-all text-sm">Final URL · {group.finalUrl}</p>
        {Object.entries(TEXT_FIELDS).map(([field, [label]]) => <div key={field} className="text-sm"><h5 className="font-medium">{label}</h5><ul className="list-disc pl-5">{splitLines(group[field]).map((line) => <li key={line}>{line}</li>)}</ul></div>)}
        <ImagePreviews images={[...group.landscape, ...group.square, ...group.portrait]} />
        <VideoPreviews urls={group.videos} />
        <div className="pmax-card-heading pmax-review-signals"><h5>Audience signals</h5><button type="button" className="pmax-text-button" onClick={() => navigate(5, group.key)}>Edit signals</button></div>
        <p className="text-sm">{[group.audience, ...group.segments].filter(Boolean).map((id) => audienceNames.get(id) || id).join(', ') || 'No audience selected'}</p>
        <p className="text-sm">Search themes · {splitLines(group.themes).join(', ') || 'None'}</p>
      </details>)}
    </section>
  </div>
}

export default function CampaignCreationWizard({ account, onClose, onSave }) {
  const [draft, setDraft] = useState(campaignDraft)
  const [step, setStep] = useState(0)
  const [groupKey, setGroupKey] = useState(draft.groups[0].key)
  const [catalogs, setCatalogs] = useState({})
  const [reload, setReload] = useState(0)
  const [errors, setErrors] = useState({})
  const [uploads, setUploads] = useState(0)
  const [busy, setBusy] = useState(false)
  const [publishError, setPublishError] = useState(null)
  const [created, setCreated] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [restorationNotice, setRestorationNotice] = useState('')
  const dialog = useRef(null)
  const heading = useRef(null)
  const posting = useRef(false)
  const catalogKey = ({ 1: 'languages', 3: 'goals', 5: 'audiences' })[step]
  const catalog = catalogs[catalogKey]
  const { id, connectionId } = account
  const draftKey = performanceMaxDraftKey(getNexionSession()?.userId, account)
  const saveQueue = useRef(Promise.resolve())

  useEffect(() => {
    let active = true
    loadPerformanceMaxDraft(draftKey).then((saved) => {
      if (!active) return
      if (saved) {
        setDraft(saved.draft)
        setStep(saved.step)
        setGroupKey(saved.draft.groups.some((group) => group.key === saved.groupKey) ? saved.groupKey : saved.draft.groups[0].key)
        setReviewing(Boolean(saved.reviewing))
        if (saved.imagesMissing) setRestorationNotice('Some saved images could not be restored from this browser. Please select those images again; all other campaign details were restored.')
      }
      setRestoring(false)
    }).catch(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [draftKey])
  useEffect(() => {
    if (restoring || !draftKey || created) return
    const snapshot = { draft, step, groupKey, reviewing }
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => savePerformanceMaxDraft(draftKey, snapshot))
  }, [draft, step, groupKey, reviewing, restoring, created, draftKey])
  useEffect(() => {
    if (restoring) return
    const modal = dialog.current
    modal.showModal()
    return () => modal.close()
  }, [restoring])
  useEffect(() => {
    heading.current?.focus()
  }, [step])
  useEffect(() => {
    if (!catalogKey || catalog?.data) return
    const abort = new AbortController()
    googleAdsApi.campaignCreationOptions({ id, connectionId }, catalogKey, { signal: abort.signal })
      .then((data) => { if (!abort.signal.aborted) setCatalogs((old) => ({ ...old, [catalogKey]: { data } })) })
      .catch((error) => { if (!abort.signal.aborted) setCatalogs((old) => ({ ...old, [catalogKey]: { error: error.message } })) })
    return () => abort.abort()
  }, [catalogKey, id, connectionId, reload]) // Keep successfully loaded options across steps.

  const change = (key, value) => setDraft((old) => ({ ...old, [key]: value }))
  const updateGroup = (key, field, value) => setDraft((old) => ({
    ...old, groups: old.groups.map((group) => group.key === key ? { ...group, [field]: value } : group),
  }))
  const navigate = (next, key) => {
    if (key) setGroupKey(key)
    setErrors({})
    setStep(next)
  }
  const addGroup = () => {
    const group = groupDraft()
    setDraft((old) => ({ ...old, groups: [...old.groups, group] }))
    setGroupKey(group.key)
  }
  const removeGroup = (key) => {
    const groups = draft.groups.filter((group) => group.key !== key)
    change('groups', groups)
    setGroupKey(groups[0].key)
  }
  const catalogData = Object.fromEntries(Object.entries(catalogs).map(([key, state]) => [key, state?.data]))
  const retry = () => {
    setCatalogs((old) => ({ ...old, [catalogKey]: undefined }))
    setReload((old) => old + 1)
  }
  function validate(next) {
    const issues = stepErrors(next, draft, catalogData)
    if (!Object.keys(issues).length) return true
    const firstGroup = draft.groups.find((group) => Object.keys(issues).some((key) => key.startsWith(group.key + '.')))
    if (firstGroup) setGroupKey(firstGroup.key)
    setStep(next)
    setErrors(issues)
    return false
  }
  async function next(event) {
    event.preventDefault()
    if (busy || uploads || posting.current || created || publishError?.creationUncertain) return
    if (step < 8) {
      if (validate(step)) navigate(reviewing && step < 7 ? 7 : step + 1)
      return
    }
    for (let index = 0; index < 7; index += 1) if (!validate(index)) return
    posting.current = true
    setBusy(true)
    setPublishError(null)
    try {
      const response = await onSave(campaignPayload(draft))
      await clearPerformanceMaxDraft(draftKey)
      setCreated(response.data)
    } catch (error) { setPublishError(error) }
    finally { setBusy(false); posting.current = false }
  }
  const edit = (nextStep, key) => { setReviewing(true); navigate(nextStep, key) }
  const back = () => {
    if (reviewing && step < 7) navigate(7)
    else { setReviewing(false); navigate(step - 1) }
  }
  const closeWithDraft = () => {
    if (!created && typeof window.confirm === 'function' && !window.confirm('Close campaign setup? Your unfinished draft will remain saved for this NEXION user and Google Ads account.')) return
    onClose()
  }
  if (restoring) return <div role="status" className="pmax-wizard-loading">Restoring your saved Performance Max draft…</div>
  const biddingValue = draft.biddingStrategy === 'MAXIMIZE_CONVERSION_VALUE'
  return <dialog ref={dialog} aria-labelledby="pmax-wizard-title" className="pmax-wizard"
    onCancel={(event) => {
      event.preventDefault()
      // A cancelled native file picker bubbles a cancel event from its input.
      // Only a cancel issued by the dialog itself may close the wizard.
      if (event.target !== event.currentTarget) return
      if (!posting.current) closeWithDraft()
    }}>
    <form noValidate onSubmit={next} className="pmax-shell">
      <header className="pmax-header">
        <div className="pmax-topbar">
          <div className="pmax-identity">
            <img src={logo} alt="NEXION" className="pmax-logo" />
            <div className="pmax-title-group">
              <h3 id="pmax-wizard-title">Create a Performance Max campaign</h3>
              <p>{account.name} · {account.id} · {account.currency}</p>
            </div>
          </div>
          <button type="button" className={buttonClass} onClick={closeWithDraft} disabled={busy}>{created ? 'Close' : 'Cancel'}</button>
        </div>
        <Stepper step={step} created={created} />
      </header>
      <div className="pmax-scroll" key={step}>
        <div className="pmax-content" data-step={step}>
          {restorationNotice && <p role="status" className="pmax-notice">{restorationNotice}</p>}
          <div className="pmax-step-heading">
            <span className="pmax-step-index">Step {step + 1} of {STEPS.length}</span>
            <h4 ref={heading} tabIndex={-1}>{STEPS[step]}</h4>
            <p>{step === 8 && created ? 'Your campaign has been created in Google Ads.' : stepDescriptions[step]}</p>
          </div>
          {step === 0 && <section className={panelClass}>
            <h5>Campaign objective <RequiredMark /></h5>
            <div className="pmax-choices">
              {Object.entries(OBJECTIVES).map(([value, [label, hint]]) => <Choice key={value} name="objective" value={value} label={label} hint={hint} selected={draft.objective} onChange={(objective) => {
              change('objective', objective)
              if (!draft.budgetAmount) change('biddingStrategy', objective === 'SALES' ? 'MAXIMIZE_CONVERSION_VALUE' : 'MAXIMIZE_CONVERSIONS')
            }} />)}
            </div>
            <FieldError message={errors.objective} />
          </section>}
          {step === 1 && <>
            <section className={panelClass}><h5>Campaign details</h5>
            <Field label="Campaign name" required value={draft.name} maxLength={128} onChange={(value) => change('name', value)} error={errors.name} />
            </section>
            <section className={panelClass}><h5>Location and language</h5>
            <LocationPicker account={account} selected={draft.locations} onChange={(value) => change('locations', value)} />
            <details className="pmax-details"><summary>Location targeting options</summary><div className="pmax-choices">
              {Object.entries(locationModes).map(([value, label]) => <Choice key={value} name="locationMode" value={value} label={label} selected={draft.locationMode} onChange={(mode) => change('locationMode', mode)} />)}
            </div></details>
            <CatalogState state={catalog} label="languages" retry={retry} />
            {catalog?.data?.length === 0 && <p role="status" className="pmax-hint">Google Ads returned no targetable languages. You can continue without a language selection.</p>}
            {catalog?.data && <div className="space-y-2">
              {catalog.data.length > 0 && <label className="pmax-field"><span className="pmax-label">Languages</span>
                <select value="" onChange={(event) => change('languages', [...draft.languages, event.target.value])} className={inputClass}>
                  <option value="" disabled>Add a language</option>
                  {catalog.data.filter((item) => !draft.languages.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>}
              {draft.languages.map((id) => {
                const name = catalog.data.find((item) => item.id === id)?.name || id
                return <button type="button" key={id} className="pmax-chip" aria-label={'Remove ' + name} onClick={() => change('languages', draft.languages.filter((item) => item !== id))}>{name} ×</button>
              })}
              {!draft.languages.length && catalog.data.length > 0 && <p className="pmax-hint">All languages are eligible.</p>}
            </div>}
            </section>
            <section className={panelClass}><h5>Schedule</h5><div className="pmax-grid">
              <Field label="Start date" type="date" hint="Blank starts today in the account time zone." value={draft.startDate} onChange={(value) => change('startDate', value)} />
              <Field label="End date (optional)" type="date" min={draft.startDate || undefined} value={draft.endDate} onChange={(value) => change('endDate', value)} error={errors.endDate} />
            </div></section>
          </>}
          {step === 2 && <>
            <section className={panelClass}><h5>Daily budget</h5>
            <Field required label={'Average daily budget (' + account.currency + ')'} type="text" inputMode="decimal" value={draft.budgetAmount} onChange={(value) => change('budgetAmount', value)} error={errors.budgetAmount} />
            </section>
            <section className={panelClass}><h5>Bidding strategy <RequiredMark /></h5>
            <div className="pmax-choices">{Object.entries(STRATEGIES).map(([value, [label, hint]]) => <Choice name="biddingStrategy" key={value} value={value} label={label} hint={hint} selected={draft.biddingStrategy} onChange={(strategy) => change('biddingStrategy', strategy)} />)}</div>
            {biddingValue
              ? <Field label="Target ROAS (%) · optional" type="text" inputMode="decimal" hint="For example, 350 means a target of 3.5 in conversion value per 1 of ad spend." value={draft.targetRoas} onChange={(value) => change('targetRoas', value)} error={errors.targetRoas} />
              : <Field label={'Target CPA (' + account.currency + ') · optional'} type="text" inputMode="decimal" hint="Average amount you’d like to spend per conversion." value={draft.targetCpa} onChange={(value) => change('targetCpa', value)} error={errors.targetCpa} />}
            </section>
          </>}
          {step === 3 && <ConversionGoals catalog={catalog} draft={draft} change={change} error={errors.goals} retry={retry} />}
          {step === 4 && <AssetGroupFields draft={draft} groupKey={groupKey} selectGroup={setGroupKey} updateGroup={updateGroup} change={change} addGroup={addGroup} removeGroup={removeGroup} errors={errors} uploading={uploads > 0} onUpload={(delta) => setUploads((count) => count + delta)} />}
          {step === 5 && <AudienceSignals catalog={catalog} draft={draft} updateGroup={updateGroup} errors={errors} retry={retry} />}
          {step === 6 && <>
            <section className={panelClass}>
            <h5>EU political advertising declaration <RequiredMark /></h5>
            <div className="pmax-choices">
              {Object.entries(political).map(([value, label]) => <Choice key={value} name="euPoliticalAdvertising" value={value} label={label} selected={draft.euPoliticalAdvertising} onChange={(selection) => change('euPoliticalAdvertising', selection)} />)}
            </div>
              <FieldError message={errors.euPoliticalAdvertising} />
            </section>
            <details className="pmax-card pmax-details" open={errors.finalUrlSuffix || errors.brandColors ? true : undefined}>
              <summary>Advanced settings</summary>
              <div className="pmax-stack">
              <label className="pmax-check-row"><input type="checkbox" checked={draft.urlExpansion} onChange={(event) => change('urlExpansion', event.target.checked)} />
                <span><strong>Final URL expansion</strong><br />Allow Google Ads to select a more relevant landing page and generate matching ad text.</span>
              </label>
              <Field label="Final URL suffix (optional)" placeholder="utm_source=google&utm_medium=cpc" value={draft.finalUrlSuffix} onChange={(value) => change('finalUrlSuffix', value)} error={errors.finalUrlSuffix} />
              <div className="pmax-grid">
                <Field label="Brand main color (optional)" placeholder="#1A73E8" value={draft.mainColor} onChange={(value) => change('mainColor', value)} error={errors.brandColors} />
                <Field label="Brand accent color (optional)" placeholder="#202124" value={draft.accentColor} onChange={(value) => change('accentColor', value)} />
              </div>
              <label className="pmax-field">
                <span className="pmax-label">Brand font (optional)</span>
                <select className={inputClass} value={draft.fontFamily} onChange={(event) => change('fontFamily', event.target.value)}>
                  <option value="">Google Ads default</option>
                  {FONTS.map((font) => <option key={font}>{font}</option>)}
                </select>
              </label>
            </div></details>
            <p className="pmax-notice">Brand guidelines are enabled. Google Ads uses the business name and logos you provided for all asset groups in this campaign.</p>
          </>}
          {step === 7 && <Review draft={draft} catalogs={catalogData} account={account} navigate={edit} />}
          {step === 8 && (created ? <div role="status" className={panelClass}>
            <p className="font-semibold">Google Ads confirmed your Performance Max campaign.</p>
            <p>Campaign ID · {created.campaignId}</p><p>Google Ads status · {created.status}</p>
            <p>Asset groups created · {created.assetGroups.length}</p>
          </div> : <div className={panelClass}>
            <p>Create <strong>{draft.name}</strong> in Google Ads account <strong>{account.id}</strong>.</p>
            <p>The campaign is created paused. You can enable it separately from the campaigns list after review.</p>
            {publishError && <p role="alert" className="pmax-field-error">{publishError.message}{publishError.diagnosticId && <> Reference {publishError.diagnosticId}.</>}</p>}
          </div>)}
        </div>
      </div>
      <footer className="pmax-footer">
        {created || publishError?.creationUncertain
          ? <button type="button" className={buttonClass} onClick={closeWithDraft}>Return to campaigns</button>
          : <>
            <button type="button" className={buttonClass} onClick={back} disabled={step === 0 && !reviewing || busy || uploads > 0}>Back</button>
            <button type="submit" className="pmax-button pmax-primary" disabled={busy || uploads > 0}>
              {busy ? 'Waiting for Google Ads…' : step === 8 ? 'Create paused campaign' : step === 7 ? 'Continue to publish' : reviewing ? 'Return to review' : 'Continue'}
            </button>
          </>}
      </footer>
    </form>
  </dialog>
}
