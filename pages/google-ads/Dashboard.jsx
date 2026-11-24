import { useState } from 'react'
import { useGoogleAdsAccount } from '../../context/GoogleAdsAccountContext.jsx'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import { getNexionRole } from '../../services/googleAdsApi.js'
import { useDashboardData } from '../../context/useDashboardData.js'
import StatCard from '../../components/google-ads/StatCard.jsx'
import PerformanceChart from '../../components/google-ads/PerformanceChart.jsx'
import CampaignTable from '../../components/google-ads/CampaignTable.jsx'
import DateRangeSelector from '../../components/google-ads/DateRangeSelector.jsx'

export default function Dashboard() {
  const { selected: selectedAccount, loading: accountsLoading, errors: accountErrors } = useGoogleAdsAccount()
  const { error: connectionError } = useGoogleAds()
  const [dateRange, setDateRange] = useState('last_30_days')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const { report, loading, error, needsCustomDates } = useDashboardData({
    account: selectedAccount, accountsLoading,
    dateRange,
    startDate: dateRange === 'custom' ? customRange.start : undefined,
    endDate: dateRange === 'custom' ? customRange.end : undefined,
  })
  const currency = selectedAccount?.currency || ''
  const overview = report?.overview
  const previousOverview = report?.previousPeriod?.overview
  const timeSeries = report?.timeSeries || []
  const trend = (key) => {
    const previous = Number(previousOverview?.[key])
    const current = Number(overview?.[key])
    return Number.isFinite(previous) && previous !== 0 && Number.isFinite(current)
      ? { direction: current >= previous ? 'up' : 'down', value: Math.abs((current - previous) / Math.abs(previous) * 100).toFixed(1) }
      : null
  }
  const cards = [
    { key: 'totalSpend', title: 'Total Spend', icon: 'account_balance_wallet', isCurrency: true },
    { key: 'impressions', title: 'Impressions', icon: 'visibility' },
    { key: 'clicks', title: 'Clicks', icon: 'mouse' },
    { key: 'conversions', title: 'Conversions', icon: 'flag' },
    { key: 'conversionValue', title: 'Conversion Value', icon: 'payments', isCurrency: true },
    { key: 'roas', title: 'ROAS', icon: 'trending_up', subtitle: 'Conversion value / spend' },
    { key: 'ctr', title: 'CTR', icon: 'trending_up', subtitle: 'Clicks / impressions (%)' },
    { key: 'cpc', title: 'CPC', icon: 'payments', isCurrency: true },
    { key: 'conversionRate', title: 'Conversion Rate', icon: 'analytics', subtitle: 'Conversions / interactions (%)' },
    { key: 'costPerConversion', title: 'Cost / Conv.', icon: 'money_off', isCurrency: true },
  ]

  return (
    <div className="ads-stack">
      <div className="ads-toolbar">
        <div className="min-w-0 max-w-full basis-full sm:basis-auto">
          <h2 className="ads-page-title mb-1">Campaign Overview</h2>
          <p className="ads-description">
            {selectedAccount ? `${selectedAccount.name} · ${selectedAccount.id}${currency ? ` · ${currency}` : ''}` : 'Select an authorized Google Ads account.'}
          </p>
          {selectedAccount?.timeZone && <p className="ads-description">Reporting time zone: {selectedAccount.timeZone}. Last 7, 14 and 30 days exclude today.</p>}
        </div>
        <div className="ads-actions">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,14rem))]">
          <label className="ads-field">Start date <input aria-label="Start date" type="date" value={customRange.start} max={customRange.end || undefined} onChange={(event) => setCustomRange((range) => ({ ...range, start: event.target.value }))} className="ads-control" /></label>
          <label className="ads-field">End date <input aria-label="End date" type="date" value={customRange.end} min={customRange.start || undefined} onChange={(event) => setCustomRange((range) => ({ ...range, end: event.target.value }))} className="ads-control" /></label>
        </div>
      )}

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {needsCustomDates && <p role="status">Choose a valid start and end date to load performance.</p>}
      {!accountsLoading && !selectedAccount && !connectionError && !accountErrors.length && <p role="status">No authorized Google Ads customer accounts are available. An active connection is required to view performance.</p>}
      {loading && <p role="status">Loading Google Ads performance…</p>}

      {(loading || report) && (
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ key, ...card }) => <StatCard key={key} {...card} value={overview?.[key] ?? 0} trend={trend(key)} currency={currency ? `${currency} ` : ''} iconBg="bg-primary" iconColor="text-on-primary" loading={loading} />)}
        </div>
      )}

      {report && (
        <>
          {!report.campaigns.length && <p role="status" className="ads-card ads-card-padding ads-description">No campaigns found for this account. Performance totals are zero.</p>}
          {timeSeries.length ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
              {[['Spend', 'spend'], ['Clicks', 'clicks'], ['Conversions', 'conversions'], ['Conversion Value', 'conversionValue']].map(([title, key]) => (
                <PerformanceChart key={key} title={`${title} Over Time${key === 'spend' && currency ? ` (${currency})` : ''}`} labels={timeSeries.map((point) => point.date)} datasets={[{ label: title, data: timeSeries.map((point) => point[key]), borderColor: key === 'conversions' ? '#34a853' : '#4285F4' }]} />
              ))}
            </div>
          ) : <p role="status" className="ads-card ads-card-padding ads-description">No performance activity was returned for the selected date range.</p>}
          {report.campaigns.length > 0 && <CampaignTable campaigns={report.campaigns} currency={currency} readOnly={getNexionRole() === 'superadmin'} />}
        </>
      )}
    </div>
  )
}
