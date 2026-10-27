import { useState, useEffect } from 'react'
import { useGoogleAds } from '../../context/GoogleAdsContext.jsx'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { mockTimeSeriesData } from '../../data/googleAdsMockData.js'
import StatCard from '../../components/google-ads/StatCard.jsx'
import PerformanceChart from '../../components/google-ads/PerformanceChart.jsx'
import CampaignTable from '../../components/google-ads/CampaignTable.jsx'
import AccountSelector from '../../components/google-ads/AccountSelector.jsx'
import DateRangeSelector from '../../components/google-ads/DateRangeSelector.jsx'
import Toast from '../../components/google-ads/Toast.jsx'

export default function Dashboard() {
  const { account } = useGoogleAds()
  const [overview, setOverview] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateRange, setDateRange] = useState('last_30_days')
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [overviewRes, accountsRes, campaignsRes] = await Promise.all([
          googleAdsApi.getOverviewStats(),
          googleAdsApi.getAccounts(),
          googleAdsApi.getCampaigns(),
        ])

        setOverview(overviewRes.data)
        setAccounts(accountsRes.data || [])
        setCampaigns(campaignsRes.data || [])

        if (accountsRes.data && accountsRes.data.length > 0 && !selectedAccount) {
          setSelectedAccount(accountsRes.data[0].id)
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedAccount, dateRange])

  return (
    <div className="space-y-stack-lg">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary mb-1">
            Campaign Overview
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Showing performance data for {account?.name || 'your Google Ads account'}.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <AccountSelector
            accounts={accounts}
            selected={selectedAccount}
            onChange={setSelectedAccount}
          />
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <StatCard
          title="Total Spend"
          value={overview?.totalSpend || 0}
          subtitle={`Period: ${dateRange.replace('_', ' ')}`}
          icon="account_balance_wallet"
          iconBg="bg-primary"
          iconColor="text-on-primary"
          isCurrency
          currency="₹ "
          trend={{ direction: 'up', value: 8.2 }}
          loading={loading}
        />
        <StatCard
          title="Impressions"
          value={overview?.impressions || 0}
          subtitle="Ad impressions shown"
          icon="visibility"
          iconBg="bg-google-ads-blue"
          iconColor="text-on-primary"
          trend={{ direction: 'up', value: 12.4 }}
          loading={loading}
        />
        <StatCard
          title="Clicks"
          value={overview?.clicks || 0}
          subtitle="Total clicks received"
          icon="mouse"
          iconBg="bg-google-ads-green"
          iconColor="text-on-primary"
          trend={{ direction: 'up', value: 5.7 }}
          loading={loading}
        />
        <StatCard
          title="Conversions"
          value={overview?.conversions || 0}
          subtitle="Actions completed"
          icon="flag"
          iconBg="bg-google-ads-red"
          iconColor="text-on-primary"
          trend={{ direction: 'up', value: 15.3 }}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <StatCard
          title="CTR"
          value={overview?.ctr || 0}
          subtitle={overview?.ctr ? `${overview.ctr}%` : 'No data'}
          icon="trending_up"
          iconBg="bg-gold"
          iconColor="text-on-primary"
          loading={loading}
        />
        <StatCard
          title="CPC"
          value={overview?.cpc || 0}
          isCurrency
          currency="₹ "
          subtitle="Avg. cost per click"
          icon="payments"
          iconBg="bg-surface-container"
          iconColor="text-primary"
          trend={{ direction: 'down', value: 3.1 }}
          loading={loading}
        />
        <StatCard
          title="Conversion Rate"
          value={overview?.conversionRate || 0}
          subtitle={overview?.conversionRate ? `${overview.conversionRate}%` : 'No data'}
          icon="analytics"
          iconBg="bg-google-ads-blue"
          iconColor="text-on-primary"
          loading={loading}
        />
        <StatCard
          title="Cost / Conv."
          value={overview?.costPerConversion || 0}
          isCurrency
          currency="₹ "
          subtitle="Avg. cost per conversion"
          icon="money_off"
          iconBg="bg-google-ads-green"
          iconColor="text-on-primary"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <PerformanceChart
          title="Spend Over Time"
          labels={mockTimeSeriesData.dates}
          datasets={[
            {
              label: 'Spend',
              data: mockTimeSeriesData.spend,
              borderColor: '#0f5238',
            },
          ]}
          loading={loading}
        />
        <div className="grid grid-cols-1 gap-gutter">
          <PerformanceChart
            title="Clicks Over Time"
            labels={mockTimeSeriesData.dates}
            datasets={[
              {
                label: 'Clicks',
                data: mockTimeSeriesData.clicks,
                borderColor: '#4285f4',
              },
            ]}
            loading={loading}
          />
          <PerformanceChart
            title="Conversions Over Time"
            labels={mockTimeSeriesData.dates}
            datasets={[
              {
                label: 'Conversions',
                data: mockTimeSeriesData.conversions,
                borderColor: '#34a853',
              },
            ]}
            loading={loading}
          />
        </div>
      </div>

      <CampaignTable campaigns={campaigns} loading={loading} />

      {showToast && (
        <Toast
          message={error || 'Data updated successfully'}
          type={error ? 'error' : 'success'}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
