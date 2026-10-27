import { formatCurrency, formatNumber } from '../../utils/format.js'

const statusColors = {
  enabled: 'bg-google-ads-green/10 text-google-ads-green border-google-ads-green/20',
  paused: 'bg-warning/10 text-warning border-warning/20',
  removed: 'bg-error/10 text-error border-error/20',
  eligible: 'bg-google-ads-green/10 text-google-ads-green',
}

const statusLabels = {
  enabled: 'Eligible',
  paused: 'Paused',
  removed: 'Removed',
}

export default function CampaignTable({ campaigns, loading, onEdit, onPauseToggle }) {
  const columns = [
    { key: 'name', label: 'Campaign Name', render: (val) => <span className="font-medium text-primary">{val}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm border ${statusColors[val] || statusColors.removed}`}>
          {statusLabels[val] || val}
        </span>
      ),
    },
    { key: 'dailyBudget', label: 'Daily Budget', render: (val) => formatCurrency(val) },
    { key: 'impressions', label: 'Impressions', render: (val) => formatNumber(val) },
    { key: 'clicks', label: 'Clicks', render: (val) => formatNumber(val) },
    { key: 'ctr', label: 'CTR', render: (val) => `${val}%` },
    { key: 'cpc', label: 'CPC', render: (val) => formatCurrency(val) },
    { key: 'conversions', label: 'Conversions', render: (val) => formatNumber(val) },
    { key: 'cost', label: 'Spend', render: (val) => formatCurrency(val) },
  ]

  if (loading) {
    return (
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-variant">
          <div className="h-6 bg-surface-container-low rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="divide-y divide-surface-variant">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4">
              {[...Array(9)].map((_, j) => (
                <div key={j} className="h-4 bg-surface-container-low rounded flex-1 animate-pulse"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">campaign</span>
        <p className="font-body-md text-body-md text-on-surface-variant">No campaigns found. Create your first campaign to get started.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft overflow-hidden">
      <div className="p-4 border-b border-surface-variant flex justify-between items-center">
        <h3 className="font-headline-sm text-headline-sm text-primary">Campaign Performance</h3>
        <span className="font-label-sm text-label-sm text-on-surface-variant">{campaigns.length} campaigns</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium text-left">{col.label}</th>
              ))}
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant font-body-md text-body-md">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-primary">{campaign.name}</span>
                  <span className="ml-2 font-label-sm text-label-sm text-on-surface-variant">({campaign.type})</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm border ${statusColors[campaign.status] || ''}`}>
                    {statusLabels[campaign.status] || campaign.status}
                  </span>
                </td>
                <td className="px-4 py-3">{formatCurrency(campaign.dailyBudget)}</td>
                <td className="px-4 py-3">{formatNumber(campaign.impressions)}</td>
                <td className="px-4 py-3">{formatNumber(campaign.clicks)}</td>
                <td className="px-4 py-3">{campaign.ctr}%</td>
                <td className="px-4 py-3">{formatCurrency(campaign.cpc)}</td>
                <td className="px-4 py-3">{formatNumber(campaign.conversions)}</td>
                <td className="px-4 py-3">{formatCurrency(campaign.cost)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onPauseToggle?.(campaign)}
                      className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      aria-label={campaign.status === 'enabled' ? 'Pause' : 'Enable'}
                      title={campaign.status === 'enabled' ? 'Pause' : 'Enable'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {campaign.status === 'enabled' ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    <button
                      onClick={() => onEdit?.(campaign)}
                      className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      aria-label="Edit"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      aria-label="More"
                      title="More actions"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
