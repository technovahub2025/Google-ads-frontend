import { useEffect, useRef, useState } from 'react'
import { useGoogleAdsAccount } from '../../context/GoogleAdsAccountContext.jsx'
import { getNexionSession, googleAdsApi } from '../../services/googleAdsApi.js'
import { MANAGEMENT, managementRows, managementPayload } from '../../utils/googleAdsManagement.js'
import { hasPerformanceMaxDraft, performanceMaxDraftKey } from '../../utils/performanceMaxDraft.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import { formatCurrency } from '../../utils/format.js'
import { readGoogleAdsCache, writeGoogleAdsCache } from '../../services/googleAdsCache.js'

const inputClass = 'ads-control'
const buttonClass = 'ads-button'
const idValues = (kind, row) => ({ [MANAGEMENT[kind].id]: row.id, ...(['ads', 'keywords'].includes(kind) ? { adGroupId: row.adGroupId } : {}) })

export function ManagementForm({ kind, row, dependencies, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: row?.name || '', budgetAmount: row?.amount ?? '', budgetId: row?.budgetId || '',
    campaignId: row?.campaignId || '', adGroupId: row?.adGroupId || '', cpcBid: row?.cpcBid ?? '',
    headlines: row?.headlines?.join('\n') || '', descriptions: row?.descriptions?.join('\n') || '',
    finalUrl: row?.finalUrl || '', keyword: '', matchType: 'EXACT',
    startDate: row?.startDate || '', endDate: row?.endDate === '2037-12-30' ? '' : row?.endDate || '',
  }))
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const editing = Boolean(row)
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const field = (key, label, options = {}) => <label className="ads-field" key={key}><span>{label}</span><input className={inputClass} value={form[key]} onChange={(event) => change(key, event.target.value)} required {...options} /></label>
  const select = (key, label, choices, required = true) => <label className="ads-field"><span>{label}</span><select required={required} className={inputClass} value={form[key]} onChange={(event) => change(key, event.target.value)}><option value="">{required ? 'Select...' : 'Create a new daily budget'}</option>{choices.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
  const submit = async (event) => {
    event.preventDefault(); if (busy) return
    setError(''); setBusy(true)
    try { await onSave(managementPayload(kind, form, editing)); onClose() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <div role="dialog" aria-modal="true" aria-label={`${editing ? 'Edit' : 'Create'} ${MANAGEMENT[kind].title}`} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
    <form onSubmit={submit} className="ads-card ads-card-padding ads-stack max-h-[90dvh] w-full max-w-xl overflow-y-auto">
      <h3 className="ads-section-title">{editing ? 'Edit' : 'Create'} {MANAGEMENT[kind].title}</h3>
      {['campaigns', 'budgets', 'adGroups'].includes(kind) && field('name', 'Name', { maxLength: 128, readOnly: editing && kind === 'budgets' })}
      {kind === 'campaigns' && <>
        {select('budgetId', 'Daily budget', dependencies.budgets.filter((item) => item.campaign_budget.period === 'DAILY').map((item) => [String(item.campaign_budget.id), item.campaign_budget.name]))}
        {field('endDate', 'End date (optional)', { type: 'date', required: false, min: form.startDate || undefined })}
      </>}
      {kind === 'budgets' && <><p>Daily budget, STANDARD delivery. This changes a spending limit; it is not a payment.</p>{field('budgetAmount', 'Daily amount', { type: 'number', min: '0.000001', step: '0.000001' })}</>}
      {kind === 'adGroups' && <>
        {!editing && select('campaignId', 'Manual CPC Search campaign', dependencies.campaigns.filter((item) => item.campaign.advertising_channel_type === 'SEARCH' && item.campaign.bidding_strategy_type === 'MANUAL_CPC').map((item) => [String(item.campaign.id), item.campaign.name]))}
        {(!editing || row.biddingStrategy === 'MANUAL_CPC') && field('cpcBid', 'CPC bid', { type: 'number', min: '0.000001', step: '0.000001' })}
        {!editing && <p>New ad groups are created PAUSED.</p>}
      </>}
      {['ads', 'keywords'].includes(kind) && !editing && select('adGroupId', 'Standard Search ad group', dependencies.groups.filter((item) => item.campaign.advertising_channel_type === 'SEARCH' && item.ad_group.type === 'SEARCH_STANDARD').map((item) => [String(item.ad_group.id), `${item.campaign.name} / ${item.ad_group.name}`]))}
      {kind === 'ads' && <>
        <p>Responsive Search Ad. New ads are created PAUSED.</p>
        {['headlines', 'descriptions'].map((key) => <label className="ads-field" key={key}>{key === 'headlines' ? '3–15 unique headlines, one per line, up to 30 characters each' : '2–4 unique descriptions, one per line, up to 90 characters each'}<textarea required className={inputClass} rows={4} value={form[key]} onChange={(event) => change(key, event.target.value)} /></label>)}
        {field('finalUrl', 'Final URL', { type: 'url' })}
      </>}
      {kind === 'keywords' && <>{field('keyword', 'Keyword text', { maxLength: 80 })}{select('matchType', 'Match type', ['EXACT', 'PHRASE', 'BROAD'].map((value) => [value, value]))}<p>Search keywords are created PAUSED. Text and match type cannot be edited after creation.</p></>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="ads-actions justify-end"><button type="button" disabled={busy} onClick={onClose} className={buttonClass}>Cancel</button><button disabled={busy} className="ads-button ads-button--primary">{busy ? 'Saving...' : 'Save'}</button></div>
    </form>
  </div>
}

export default function GoogleAdsResourceManager({ kind, CreateForm = ManagementForm }) {
  const { selected, loading: accountLoading } = useGoogleAdsAccount()
  const config = MANAGEMENT[kind], selectionKey = selected?.key
  const currentSelection = useRef(selectionKey)
  const autoOpenedDraft = useRef('')
  currentSelection.current = selectionKey
  const [state, setState] = useState(null), [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null), [action, setAction] = useState(null), [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(''), [error, setError] = useState('')
  const [campaignFilter, setCampaignFilter] = useState(''), [groupFilter, setGroupFilter] = useState('')
  useEffect(() => {
    setEditor(null); setAction(null); setError(''); setMessage(''); setCampaignFilter(''); setGroupFilter(''); setState(readGoogleAdsCache(`page:${selectionKey}:${kind}`) || null)
  }, [selectionKey, kind])
  useEffect(() => {
    if (kind !== 'campaigns' || !selected || editor) return
    const key = performanceMaxDraftKey(getNexionSession()?.userId, selected)
    if (key && autoOpenedDraft.current !== key && hasPerformanceMaxDraft(key)) {
      autoOpenedDraft.current = key
      setEditor({ key: selectionKey, dependencies: state?.dependencies || {}, restore: true })
    }
  }, [kind, selected, selectionKey, state?.dependencies, editor])
  useEffect(() => {
    if (!selected) return
    let active = true; const abort = new AbortController()
    const list = (path) => googleAdsApi.managementList(path, selected.connectionId, selected.id, abort.signal)
    Promise.all([list(config.list), kind === 'campaigns' ? null : list('campaigns/settings'), kind === 'campaigns' ? list('campaign-budgets') : null, ['ads', 'keywords'].includes(kind) ? list('ad-groups') : null]).then(([response, campaigns, budgets, groups]) => {
      if ([response, campaigns, budgets, groups].filter(Boolean).some((item) => item.success !== true || !Array.isArray(item.data))) throw new Error('Invalid Google Ads management response')
      if (active) { const snapshot = { key: selectionKey, rows: managementRows(kind, response.data, campaigns?.data), dependencies: { campaigns: campaigns?.data || [], budgets: budgets?.data || [], groups: groups?.data || [] } }; writeGoogleAdsCache(`page:${selectionKey}:${kind}`, snapshot); setState(snapshot) }
    }).catch((err) => { if (active) setState({ key: selectionKey, error: err.message }) })
    return () => { active = false; abort.abort() }
  }, [selectionKey, kind, config.list, revision])
  const current = state?.key === selectionKey ? state : null
  const rows = current?.rows || []
  const mutate = async (path, method, values) => {
    if (!selected || busy) throw new Error('Wait for the current operation to finish')
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await googleAdsApi.managementChange(path, method, selected, values)
      if (currentSelection.current === selectionKey) { setRevision((value) => value + 1); setMessage(result.message || 'Google Ads confirmed the change.') }
      return result
    } catch (err) {
      if (err.creationUncertain && currentSelection.current === selectionKey) setRevision((value) => value + 1)
      throw err
    }
    finally { setBusy(false) }
  }
  const confirm = async () => {
    const pending = action
    try {
      const values = idValues(kind, pending.row)
      if (pending.type === 'remove') await mutate(`${config.path}/delete`, 'DELETE', values)
      else await mutate(`${config.path}/${kind === 'campaigns' ? 'status' : 'edit'}`, kind === 'campaigns' ? 'PATCH' : 'PUT', { ...values, status: pending.row.status === 'ENABLED' ? 'PAUSED' : 'ENABLED' })
    } catch (err) { if (currentSelection.current === selectionKey) setError(err.message) }
  }
  const Form = editor?.row ? ManagementForm : CreateForm
  const removingBudget = kind === 'budgets' && action?.type === 'remove'
  return <section className="ads-stack">
    <div className="ads-toolbar"><h2 className="ads-page-title">{config.title}</h2><div className="ads-actions"><button disabled={!selected || busy} onClick={() => setRevision((value) => value + 1)} className={buttonClass}>Refresh</button><button disabled={!selected || !current?.dependencies || busy} onClick={() => setEditor({ key: selectionKey, dependencies: current.dependencies })} className="ads-button ads-button--primary">Create {kind === 'adGroups' ? 'Ad Group' : kind === 'ads' ? 'Ad' : kind === 'budgets' ? 'Budget' : kind === 'keywords' ? 'Keyword' : 'Campaign'}</button></div></div>
    {kind === 'campaigns' && <p className="ads-description">New campaigns use Performance Max and are created paused.</p>}
    {(error || current?.error) && <p role="alert" className="text-red-700">{error || current.error}</p>}
    {message && <p role="status">{message}</p>}
    {(accountLoading || (selected && !current)) && <p role="status">Loading {config.title.toLowerCase()}...</p>}
    {!selected && !accountLoading && <p role="status">Select an authorized customer account.</p>}
    {current?.rows && <>
      {['adGroups', 'ads', 'keywords'].includes(kind) && <div className="ads-card grid gap-3 p-3 sm:grid-cols-[repeat(2,minmax(0,18rem))]">
        <label className="ads-field">Campaign <select className={inputClass} value={campaignFilter} onChange={(event) => { setCampaignFilter(event.target.value); setGroupFilter('') }}><option value="">All campaigns</option>{current.dependencies.campaigns.map((item) => <option key={item.campaign.id} value={item.campaign.id}>{item.campaign.name}</option>)}</select></label>
        {['ads', 'keywords'].includes(kind) && <label className="ads-field">Ad group <select className={inputClass} value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="">All ad groups</option>{current.dependencies.groups.filter((item) => !campaignFilter || String(item.campaign.id) === campaignFilter).map((item) => <option key={item.ad_group.id} value={item.ad_group.id}>{item.ad_group.name}</option>)}</select></label>}
      </div>}
      <div className="ads-table-scroll ads-card" tabIndex={0} role="region" aria-label={config.title}><table className="ads-table min-w-[680px]"><thead><tr>{['Name / ID', 'Campaign / Ad group', 'Status / Type', 'Settings', 'Actions'].map((title) => <th key={title} className={title === 'Actions' ? 'text-right' : undefined}>{title}</th>)}</tr></thead><tbody>
        {rows.filter((row) => (!campaignFilter || row.campaignId === campaignFilter) && (!groupFilter || row.adGroupId === groupFilter)).map((row) => <tr key={`${row.adGroupId || ''}:${row.id}`}>
          <td className="min-w-36 font-medium">{row.name}<br /><small className="font-mono font-normal text-slate-600">{row.id}</small></td><td>{row.campaignName || '—'}{row.adGroupName && <><br />{row.adGroupName}</>}</td><td>{row.status}<br />{row.type || row.matchType || row.period}</td>
          <td className="max-w-72">{row.amount !== undefined && <>{formatCurrency(row.amount, selected.currency)} {kind === 'budgets' ? row.period : '/ day'}<br /></>}{row.biddingStrategy}{row.startDate && <><br />{row.startDate} – {row.endDate || 'No end date'}</>}{row.deliveryMethod}{row.cpcBid !== undefined && formatCurrency(row.cpcBid, selected.currency)}{row.finalUrl && <><br />{row.finalUrl}</>}</td>
          <td className="min-w-44 text-right"><div className="ads-actions justify-end">
            {kind !== 'keywords' && <button disabled={!row.supported || busy} onClick={() => setEditor({ key: selectionKey, row, dependencies: current.dependencies })} className="ads-button ads-button--compact">Edit</button>}
            {kind !== 'budgets' && <button disabled={!(row.canChangeStatus ?? row.supported) || busy} onClick={() => setAction({ type: 'status', row })} className="ads-button ads-button--compact">{row.status === 'ENABLED' ? 'Pause' : 'Enable'}</button>}
            <button disabled={(!(row.canChangeStatus ?? row.supported) && kind !== 'budgets') || busy} onClick={() => setAction({ type: 'remove', row })} className="ads-button ads-button--compact ads-button--danger">Remove</button>
          </div>{!row.supported && <small>Editing this type is not supported.</small>}</td>
        </tr>)}
        {!rows.length && <tr><td colSpan={5} className="p-6">No {config.title.toLowerCase()} found for this account.</td></tr>}
      </tbody></table></div>
    </>}
    {editor && editor.key === selectionKey && <Form key={`${selectionKey}:${editor.row?.id || 'new'}`} kind={kind} account={selected} row={editor.row} dependencies={editor.dependencies} onClose={() => setEditor(null)} onSave={(values) => mutate(`${config.path}${editor.row ? '/edit' : ''}`, editor.row ? 'PUT' : 'POST', { ...values, ...(editor.row ? idValues(kind, editor.row) : {}) })} />}
    {action && <ConfirmDialog isOpen onClose={() => setAction(null)} onConfirm={confirm} title={removingBudget ? 'Delete campaign budget?' : action.type === 'remove' ? 'Remove from Google Ads?' : action.row.status === 'ENABLED' ? 'Pause serving?' : 'Enable serving?'} message={removingBudget ? 'Only budgets that are not assigned to a campaign can be deleted. Deletion is permanent.' : action.type === 'remove' ? 'Removal is permanent in Google Ads.' : action.row.status === 'ENABLED' ? 'This stops this resource from serving.' : 'Enabling may start ad delivery and spending when parent resources are enabled.'} />}
  </section>
}
