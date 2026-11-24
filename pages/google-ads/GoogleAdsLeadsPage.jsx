import { useEffect, useMemo, useState } from 'react'
import { useGoogleAdsAccount } from '../../context/GoogleAdsAccountContext.jsx'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { readGoogleAdsCache, writeGoogleAdsCache } from '../../services/googleAdsCache.js'
import { downloadLeadsCsv, downloadLeadsXlsx } from '../../utils/googleAdsLeadExport.js'

const dateValue = (value) => { const raw = value?.toDate?.() || value?._seconds ? new Date((value._seconds || 0) * 1000) : new Date(value); return Number.isNaN(raw.getTime()) ? '—' : raw.toLocaleString() }
const inputClass = 'ads-control'
const statuses = [['', 'All statuses'], ['new', 'New'], ['review', 'Needs review'], ['contacted', 'Contacted'], ['converted', 'Converted'], ['lost', 'Lost']]

function Stat({ label, value }) { return <div className="ads-card ads-card-padding"><p className="ads-metric-label">{label}</p><p className="ads-metric-value mt-1">{value ?? 0}</p></div> }

export default function GoogleAdsLeadsPage() {
  const { selected, loading: accountLoading } = useGoogleAdsAccount()
  const [filters, setFilters] = useState({ search: '', status: '', campaignId: '', startDate: '', endDate: '', page: 1, pageSize: 25 })
  const [searchInput, setSearchInput] = useState('')
  const [selectedLeadIds, setSelectedLeadIds] = useState(() => new Set())
  const [exportScope, setExportScope] = useState('filtered')
  const [state, setState] = useState(null); const [detail, setDetail] = useState(null); const [busy, setBusy] = useState(false); const [exporting, setExporting] = useState(''); const [message, setMessage] = useState('')
  const selectionKey = selected?.key
  const cacheKey = `page:leads:${selectionKey}:${JSON.stringify(filters)}`
  const load = async (signal, isCurrent = () => true) => { if (!selected) return; try { const snapshot = { key: selectionKey, ...(await googleAdsApi.getLeads(selected, filters, signal)) }; if (isCurrent()) { writeGoogleAdsCache(cacheKey, snapshot); setState(snapshot) } } catch (error) { if (isCurrent() && !signal?.aborted && error.name !== 'AbortError' && error.code !== 'ERR_CANCELED' && !/(?:abort|cancell?ed|cancell?ation)/i.test(String(error.message || ''))) setState((current) => current || { key: selectionKey, error: error.message }) } }
  useEffect(() => { let active = true; const abort = new AbortController(); setState(readGoogleAdsCache(cacheKey) || null); load(abort.signal, () => active); return () => { active = false; abort.abort() } }, [selectionKey, JSON.stringify(filters)])
  useEffect(() => setSelectedLeadIds(new Set()), [selectionKey])
  const current = state?.key === selectionKey ? state : null
  const visibleLeads = current?.leads || []
  const campaigns = useMemo(() => [...new Set(visibleLeads.map((lead) => String(lead.campaignId || '')).filter(Boolean))], [visibleLeads])
  const visibleIds = useMemo(() => visibleLeads.map((lead) => String(lead.leadId)), [visibleLeads])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedLeadIds.has(id))
  const setFilter = (key, value) => { setSelectedLeadIds(new Set()); setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 })) }
  useEffect(() => { const timer = setTimeout(() => setFilters((current) => { if (current.search === searchInput) return current; setSelectedLeadIds(new Set()); return { ...current, search: searchInput, page: 1 } }), 250); return () => clearTimeout(timer) }, [searchInput])
  const changeStatus = async (lead, status) => { setBusy(true); setMessage(''); try { await googleAdsApi.updateLead(selected, lead.leadId, { status }); setMessage('Lead status updated.'); await load() } catch (error) { setMessage(error.message) } finally { setBusy(false) } }
  const toggleLead = (leadId) => setSelectedLeadIds((current) => { const next = new Set(current); const id = String(leadId); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleVisible = () => setSelectedLeadIds((current) => { const next = new Set(current); if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id)); else visibleIds.forEach((id) => next.add(id)); return next })
  const exportLeads = async (format) => {
    if (!selected || exporting) return
    if (exportScope === 'selected' && selectedLeadIds.size === 0) { setMessage('Select at least one lead to export.'); return }
    setExporting(format); setMessage('')
    try {
      const scopeFilters = exportScope === 'all' ? {} : { ...filters, page: 1 }
      const result = await googleAdsApi.getAllLeads(selected, scopeFilters)
      const leads = exportScope === 'selected' ? result.leads.filter((lead) => selectedLeadIds.has(String(lead.leadId))) : result.leads
      if (!leads.length) { setMessage('There are no leads to export for this selection.'); return }
      const stamp = new Date().toISOString().slice(0, 10)
      const scopeName = exportScope === 'all' ? 'all' : exportScope
      const filename = `google-ads-leads-${scopeName}-${stamp}.${format === 'xlsx' ? 'xlsx' : 'csv'}`
      if (format === 'xlsx') downloadLeadsXlsx(leads, filename)
      else downloadLeadsCsv(leads, filename)
      setMessage(`${leads.length} lead${leads.length === 1 ? '' : 's'} exported.`)
    } catch (error) { setMessage(error.message || 'Unable to export leads.') } finally { setExporting('') }
  }
  return <section className="ads-stack">
    <div className="ads-toolbar"><div><p className="mb-1 text-sm font-medium uppercase tracking-wide text-google-ads-blue">Google Ads</p><h1 className="ads-page-title">Leads</h1><p className="ads-description mt-2">Review Google Ads lead-form submissions assigned to this customer account.</p></div><div className="ads-actions"><button className="ads-button" disabled={!selected || accountLoading} onClick={() => load()}>Refresh</button><select aria-label="Export lead scope" className="ads-control w-auto" value={exportScope} onChange={(e) => setExportScope(e.target.value)}><option value="all">All leads</option><option value="filtered">Filtered leads</option><option value="selected">Selected leads</option></select><button className="ads-button ads-button--compact" disabled={!selected || !!exporting} onClick={() => exportLeads('csv')}>{exporting === 'csv' ? 'Exporting…' : 'CSV'}</button><button className="ads-button ads-button--compact" disabled={!selected || !!exporting} onClick={() => exportLeads('xlsx')}>{exporting === 'xlsx' ? 'Exporting…' : 'Excel'}</button></div></div>
    {current?.error && <p role="alert" className="text-red-700">{current.error}</p>}{message && <p role="status">{message}</p>}
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Total Google Ads leads" value={current?.stats?.total} /><Stat label="New leads" value={current?.stats?.new} /><Stat label="Contacted leads" value={current?.stats?.contacted} /><Stat label="Converted leads" value={current?.stats?.converted} /></div>
    <div className="ads-card grid min-w-0 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"><label className="ads-field lg:col-span-2">Search<input className={inputClass} placeholder="Name, email, phone or lead ID" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></label><label className="ads-field">Status<select className={inputClass} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="ads-field">Campaign<select className={inputClass} value={filters.campaignId} onChange={(e) => setFilter('campaignId', e.target.value)}><option value="">All campaigns</option>{campaigns.map((id) => <option key={id} value={id}>{id}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label className="ads-field">From<input type="date" className={inputClass} value={filters.startDate} onChange={(e) => setFilter('startDate', e.target.value)} /></label><label className="ads-field">To<input type="date" className={inputClass} value={filters.endDate} onChange={(e) => setFilter('endDate', e.target.value)} /></label></div></div>
    {!selected && !accountLoading && <p role="status">Select an authorized customer account.</p>}{(accountLoading || (selected && !current)) && <p role="status">Loading Google Ads leads...</p>}
    {current && <div className="ads-card ads-table-scroll" tabIndex={0} role="region" aria-label="Google Ads leads"><table className="ads-table min-w-[920px]"><thead><tr><th><input type="checkbox" aria-label="Select all visible leads" checked={allVisibleSelected} onChange={toggleVisible} disabled={!visibleIds.length} /> <span>Lead</span></th><th>Submitted</th><th>Campaign / Form</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleLeads.map((lead) => <tr key={lead.leadId}><td className="font-medium"><label className="inline-flex max-w-full items-start gap-2"><input type="checkbox" aria-label={`Select lead ${lead.leadId}`} checked={selectedLeadIds.has(String(lead.leadId))} onChange={() => toggleLead(lead.leadId)} /><span className="min-w-0 break-words">{lead.contact?.name || 'Unnamed'}<br /><small className="font-mono font-normal text-slate-600">{lead.leadId}</small></span></label></td><td>{dateValue(lead.submittedAt)}</td><td>{lead.campaignId || '—'}<br /><small>Form {lead.formId || '—'}</small></td><td>{lead.contact?.email || '—'}<br />{lead.contact?.phone || '—'}{lead.needsReview && <><br /><small className="text-amber-700">Needs review</small></>}</td><td><span className="capitalize">{lead.status}</span></td><td><div className="ads-actions"><button className="ads-button ads-button--compact" onClick={() => setDetail(lead)}>Details</button><select aria-label={`Update status for ${lead.leadId}`} disabled={busy} className="ads-control min-h-9 py-1.5" value={lead.status} onChange={(e) => changeStatus(lead, e.target.value)}>{statuses.slice(1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></td></tr>)}{!visibleLeads.length && <tr><td colSpan={6} className="p-6">No Google Ads leads match these filters.</td></tr>}</tbody></table></div>}
    {current?.pagination?.pages > 1 && <div className="ads-actions justify-end"><button className="ads-button" disabled={filters.page <= 1} onClick={() => setFilter('page', filters.page - 1)}>Previous</button><span className="px-2 text-sm">Page {filters.page} of {current.pagination.pages}</span><button className="ads-button" disabled={filters.page >= current.pagination.pages} onClick={() => setFilter('page', filters.page + 1)}>Next</button></div>}
    {detail && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}><div className="ads-card ads-card-padding ads-stack max-h-[90dvh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}><div className="ads-toolbar"><h2 className="ads-section-title">Google Ads lead details</h2><button className="ads-button" onClick={() => setDetail(null)}>Close</button></div><dl className="grid gap-3 sm:grid-cols-2">{[['Lead ID', detail.leadId], ['Customer account', detail.customerId], ['Campaign', detail.campaignId || '—'], ['Lead form', detail.formId || '—'], ['Submitted', dateValue(detail.submittedAt)], ['Source', detail.leadSource || 'LEAD_FORM']].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="break-words text-sm">{value}</dd></div>)}</dl><div><h3 className="ads-section-title mb-2">Form responses</h3><div className="ads-card ads-card-padding grid gap-2">{Object.entries(detail.formResponses || {}).map(([key, value]) => <p key={key} className="text-sm"><strong>{key.replaceAll('_', ' ')}:</strong> {value}</p>)}</div></div><p className="text-sm text-slate-600">WhatsApp consent: not assumed from Google Ads form submission.</p></div></div>}
  </section>
}
