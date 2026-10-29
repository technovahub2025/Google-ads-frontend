import { useState, useEffect, useMemo, useCallback } from 'react'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import CampaignCreationWizard from '../../components/google-ads/CampaignCreationWizard.jsx'
import { MOCK_MODE } from '../../config/googleAdsConfig.js'
import ConfirmDialog from '../../components/google-ads/ConfirmDialog.jsx'
import Toast from '../../components/google-ads/Toast.jsx'
import { formatCurrency, formatNumber } from '../../utils/format.js'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'enabled', label: 'Eligible' },
  { value: 'paused', label: 'Paused' },
  { value: 'removed', label: 'Removed' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'Search', label: 'Search' },
  { value: 'Display', label: 'Display' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Performance Max', label: 'Performance Max' },
  { value: 'Video', label: 'Video' },
  { value: 'App', label: 'App' },
  { value: 'Demand Gen', label: 'Demand Gen' },
]

const statusColors = {
  enabled: 'bg-google-ads-green/10 text-google-ads-green border-google-ads-green/20',
  paused: 'bg-warning/10 text-warning border-warning/20',
  removed: 'bg-error/10 text-error border-error/20',
}

const statusLabels = {
  enabled: 'Eligible',
  paused: 'Paused',
  removed: 'Removed',
}

const normalizeCampaign = (row) => {
  const campaign = row.campaign || row
  const status = String(campaign.status || row.status || '').toLowerCase()
  const channel = String(campaign.advertising_channel_type || campaign.advertisingChannelType || campaign.type || '')
  const types = {
    SEARCH: 'Search',
    DISPLAY: 'Display',
    SHOPPING: 'Shopping',
    PERFORMANCE_MAX: 'Performance Max',
    VIDEO: 'Video',
    MULTI_CHANNEL: 'App',
    DEMAND_GEN: 'Demand Gen',
  }
  return {
    id: String(campaign.id || row.id || campaign.resource_name || campaign.resourceName || campaign.name),
    name: campaign.name || row.name || 'Unnamed campaign',
    type: types[channel.toUpperCase()] || channel,
    status: ['enabled', 'paused', 'removed'].includes(status) ? status : status.toLowerCase(),
    biddingStrategy: campaign.bidding_strategy_type || campaign.biddingStrategyType || row.biddingStrategy || '—',
    dailyBudget: Number(campaign.budget_amount_micros || campaign.budgetAmountMicros || 0) / 1_000_000,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    ctr: Number(row.metrics?.ctr || 0),
    cpc: Number(row.metrics?.average_cpc || 0) / 1_000_000,
    conversions: Number(row.metrics?.conversions || 0),
    cost: Number(row.metrics?.cost_micros || 0) / 1_000_000,
  }
}

export default function Campaigns() {
  const { connectionId, isConnected, isLoading: connectionLoading } = useGoogleAds()
  const [campaigns, setCampaigns] = useState([])
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [confirmAction, setConfirmAction] = useState(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState('info')

  const loadCampaigns = useCallback(async (customerId) => {
    if (MOCK_MODE && !connectionId) {
      const response = await googleAdsApi.getCampaigns()
      setCampaigns(response.data || [])
      return
    }
    if (!connectionId || !customerId) {
      setCampaigns([])
      return
    }
    const response = await googleAdsApi.getCustomerCampaigns(connectionId, customerId)
    setCampaigns((response.campaigns || []).map(normalizeCampaign))
  }, [connectionId])

  useEffect(() => {
    if (connectionLoading) return
    let active = true

    const fetchAccountsAndCampaigns = async () => {
      if (!isConnected || !connectionId) {
        if (MOCK_MODE) {
          const response = await googleAdsApi.getCampaigns()
          if (active) setCampaigns(response.data || [])
        } else {
          setCampaigns([])
        }
        setAccounts([])
        setLoading(false)
        return
      }

      setAccountsLoading(true)
      setLoading(true)
      setError(null)
      try {
        const response = await googleAdsApi.getCustomerAccounts(connectionId)
        const customerAccounts = response.accounts || []
        if (!active) return
        setAccounts(customerAccounts)
        const first = customerAccounts[0]
        const selectedId = String(first?.customer_client?.id ?? first?.customerClient?.id ?? first?.id ?? '')
        setSelectedCustomerId(selectedId)
        if (selectedId) {
          const campaignsResponse = await googleAdsApi.getCustomerCampaigns(connectionId, selectedId)
          if (active) setCampaigns((campaignsResponse.campaigns || []).map(normalizeCampaign))
        } else {
          setCampaigns([])
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to load Google Ads campaigns and customer accounts.')
      } finally {
        if (active) {
          setAccountsLoading(false)
          setLoading(false)
        }
      }
    }

    fetchAccountsAndCampaigns()
    return () => { active = false }
  }, [connectionId, isConnected, connectionLoading])

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.type || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      const matchesType = typeFilter === 'all' || c.type === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [campaigns, search, statusFilter, typeFilter])

  const handlePauseToggle = (campaign) => {
    setConfirmAction({
      type: 'pause',
      item: campaign,
      title: campaign.status === 'enabled' ? 'Pause Campaign?' : 'Enable Campaign?',
      message: campaign.status === 'enabled'
        ? `Are you sure you want to pause "${campaign.name}"? It will stop serving ads.`
        : `Are you sure you want to enable "${campaign.name}"?`,
      confirmLabel: campaign.status === 'enabled' ? 'Pause' : 'Enable',
    })
  }

  const handleEdit = (campaign) => {
    setConfirmAction({
      type: 'edit',
      item: campaign,
      title: 'Edit Campaign',
      message: `Edit "${campaign.name}"`,
      confirmLabel: 'Edit',
    })
  }

  const handleConfirm = () => {
    if (!confirmAction) return

    if (confirmAction.type === 'pause') {
      const updated = campaigns.map((c) =>
        c.id === confirmAction.item.id
          ? { ...c, status: c.status === 'enabled' ? 'paused' : 'enabled' }
          : c
      )
      setCampaigns(updated)
      setToastMsg(`Campaign ${confirmAction.item.status === 'enabled' ? 'paused' : 'enabled'} successfully.`)
      setToastType('success')
      setShowToast(true)
    } else if (confirmAction.type === 'edit') {
      setToastMsg('Edit feature coming soon.')
      setToastType('info')
      setShowToast(true)
    }
    setConfirmAction(null)
  }

  const handleCreate = async () => {
    if (!MOCK_MODE && (!isConnected || !connectionId)) {
      setToastMsg('Connect a Google Ads account before creating a campaign.')
      setToastType('error')
      setShowToast(true)
      return
    }
    if (accounts.length === 0 && !accountsLoading) {
      setAccountsLoading(true)
      try {
        const response = await googleAdsApi.getCustomerAccounts(MOCK_MODE ? null : connectionId)
        const customerAccounts = response.accounts || []
        setAccounts(customerAccounts)
        const firstAccount = customerAccounts[0]?.customer_client || customerAccounts[0]?.customerClient || customerAccounts[0]
        setSelectedCustomerId(String(firstAccount?.id ?? ''))
      } catch (err) {
        setError(err.message || 'Failed to load Google Ads customer accounts.')
        return
      } finally {
        setAccountsLoading(false)
      }
    }
    setWizardOpen(true)
  }

  const handleCampaignCreated = async (createdCampaign, customerId) => {
    setSelectedCustomerId(customerId)
    if (MOCK_MODE && createdCampaign) {
      setCampaigns((current) => [createdCampaign, ...current])
      setToastMsg('Demo campaign added to the campaign list.')
      setToastType('success')
      setShowToast(true)
      return
    }
    try {
      await loadCampaigns(customerId)
    } catch (err) {
      setError(`Campaign was created, but the list could not be refreshed: ${err.message || 'request failed'}`)
    }
    setToastMsg('Campaign created successfully.')
    setToastType('success')
    setShowToast(true)
  }

  return (
    <div className="space-y-stack-lg">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-headline-md text-headline-md text-primary">Campaigns</h2>
        <button
          onClick={handleCreate}
          disabled={connectionLoading || accountsLoading}
          className="flex items-center gap-2 bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Campaign
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error">{error}</div>}
      {!connectionLoading && isConnected && accounts.length > 1 && (
        <label className="flex items-center gap-3 text-sm text-on-surface-variant">
          Customer account
          <select value={selectedCustomerId} onChange={async (event) => { const customerId = event.target.value; setSelectedCustomerId(customerId); setLoading(true); try { await loadCampaigns(customerId) } catch (err) { setError(err.message || 'Failed to load campaigns.') } finally { setLoading(false) } }} className="rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-on-surface">
            {accounts.map((raw) => { const account = raw.customer_client || raw.customerClient || raw; const id = String(account.id ?? raw.id ?? ''); return <option key={id} value={id}>{account.descriptive_name || account.descriptiveName || account.name || id}</option> })}
          </select>
        </label>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant text-on-surface font-body-md text-body-md rounded-xl pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-container-low border border-surface-variant text-on-surface font-label-md text-label-md rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-surface-container-low border border-surface-variant text-on-surface font-label-md text-label-md rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Campaign Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Bidding</th>
                <th className="px-4 py-3 font-medium text-right">Budget</th>
                <th className="px-4 py-3 font-medium text-right">Impr.</th>
                <th className="px-4 py-3 font-medium text-right">Clicks</th>
                <th className="px-4 py-3 font-medium text-right">CTR</th>
                <th className="px-4 py-3 font-medium text-right">CPC</th>
                <th className="px-4 py-3 font-medium text-right">Conversions</th>
                <th className="px-4 py-3 font-medium text-right">Spend</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant font-body-md text-body-md">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-container-low rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-8 text-center text-on-surface-variant">
                    No campaigns match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">{c.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm border ${statusColors[c.status] || ''}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.type}</td>
                    <td className="px-4 py-3">{c.biddingStrategy}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(c.dailyBudget)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(c.impressions)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(c.clicks)}</td>
                    <td className="px-4 py-3 text-right">{c.ctr}%</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(c.cpc)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(c.conversions)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(c.cost)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handlePauseToggle(c)}
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                          title={c.status === 'enabled' ? 'Pause' : 'Enable'}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {c.status === 'enabled' ? 'pause' : 'play_arrow'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.type === 'pause' ? 'warning' : 'primary'}
        />
      )}

      {showToast && (
        <Toast
          message={toastMsg}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {wizardOpen && (
        <CampaignCreationWizard
          connectionId={connectionId}
          accounts={accounts}
          accountsLoading={accountsLoading}
          onClose={() => setWizardOpen(false)}
          onCreated={handleCampaignCreated}
        />
      )}
    </div>
  )
}
