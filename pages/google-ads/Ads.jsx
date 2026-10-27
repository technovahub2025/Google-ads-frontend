import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { formatCurrency, formatNumber } from '../../utils/format.js'

const statusColors = {
  enabled: 'bg-google-ads-green/10 text-google-ads-green border-google-ads-green/20',
  paused: 'bg-warning/10 text-warning border-warning/20',
  disabled: 'bg-error/10 text-error border-error/20',
  eligible: 'bg-google-ads-green/10 text-google-ads-green',
}

const statusLabels = {
  enabled: 'Eligible',
  paused: 'Paused',
  disabled: 'Disabled',
}

export default function Ads() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await googleAdsApi.getAds()
        setAds(res.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAds()
  }, [])

  const filtered = useMemo(() => {
    return ads.filter((ad) =>
      ad.name.toLowerCase().includes(search.toLowerCase()) ||
      ad.headline.toLowerCase().includes(search.toLowerCase()) ||
      ad.campaign.toLowerCase().includes(search.toLowerCase())
    )
  }, [ads, search])

  return (
    <div className="space-y-stack-lg">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-headline-md text-headline-md text-primary">Ads</h2>
        <div className="text-sm text-on-surface-variant">
          {filtered.length} ad {filtered.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search ads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 bg-surface-container-low border border-surface-variant text-on-surface font-body-md text-body-md rounded-xl pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
        />
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Ad Name</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Ad Group</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Impr.</th>
                <th className="px-4 py-3 font-medium text-right">Clicks</th>
                <th className="px-4 py-3 font-medium text-right">CTR</th>
                <th className="px-4 py-3 font-medium text-right">CPC</th>
                <th className="px-4 py-3 font-medium text-right">Conversions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant font-body-md text-body-md">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-container-low rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-on-surface-variant">
                    No ads found.
                  </td>
                </tr>
              ) : (
                filtered.map((ad) => (
                  <tr key={ad.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-primary">{ad.name}</div>
                      {ad.headline && (
                        <div className="font-label-sm text-label-sm text-on-surface-variant mt-1 line-clamp-1">
                          {ad.headline}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{ad.campaign}</td>
                    <td className="px-4 py-3">{ad.adGroup || '—'}</td>
                    <td className="px-4 py-3">{ad.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm border ${statusColors[ad.status] || ''}`}>
                        {statusLabels[ad.status] || ad.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatNumber(ad.impressions)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(ad.clicks)}</td>
                    <td className="px-4 py-3 text-right">{ad.ctr}%</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(ad.cpc)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(ad.conversions)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
