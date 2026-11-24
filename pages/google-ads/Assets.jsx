import { useState, useEffect } from 'react'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { mockAssets } from '../../data/googleAdsMockData.js'
import * as cacheModule from '../../services/googleAdsCache.js'
const readGoogleAdsCache = (...args) => cacheModule.readGoogleAdsCache?.(...args)
const writeGoogleAdsCache = (...args) => cacheModule.writeGoogleAdsCache?.(...args)
import { useGoogleAdsAccount } from '../../context/GoogleAdsAccountContext.jsx'

const TABS = [
  { id: 'images', label: 'Images', icon: 'image' },
  { id: 'logos', label: 'Logos', icon: 'account_circle' },
  { id: 'headlines', label: 'Headlines', icon: 'title' },
  { id: 'descriptions', label: 'Descriptions', icon: 'description' },
  { id: 'other', label: 'Other Assets', icon: 'category' },
]

const statusColors = {
  enabled: 'bg-google-ads-green/10 text-google-ads-green',
  paused: 'bg-warning/10 text-warning',
  disabled: 'bg-error/10 text-error',
}

export default function Assets() {
  const [assets, setAssets] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('images')
  const { selected } = useGoogleAdsAccount()
  const cacheKey = `page:assets:${selected?.key || 'none'}`

  useEffect(() => {
    const fetchAssets = async () => {
      const cached = readGoogleAdsCache(cacheKey)
      if (cached) { setAssets(cached); setLoading(false) }
      try {
        const res = await googleAdsApi.getAssets(selected)
        const next = res.data || mockAssets
        writeGoogleAdsCache(cacheKey, next); setAssets(next)
      } catch (err) {
        console.error(err)
        if (!cached) setAssets(mockAssets)
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [cacheKey, selected])

  const currentData = assets?.[activeTab] || []
  const assetData = Array.isArray(currentData) ? currentData : []

  return (
    <div className="ads-stack">
      <h2 className="ads-page-title">Assets</h2>

      <div className="border-b border-surface-variant">
        <nav className="ads-actions -mb-px" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-t-md border-b-3 px-3 py-2 text-sm font-medium motion-safe:transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="ads-card">
        <div className="ads-card-header">
          <h3 className="ads-section-title capitalize">{TABS.find((t) => t.id === activeTab)?.label} Assets</h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {assetData.length} asset{assetData.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-surface-container-low rounded-lg p-4 animate-pulse h-32"></div>
              ))}
            </div>
          ) : assetData.length === 0 ? (
            <div className="ads-description py-8 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">
                {TABS.find((t) => t.id === activeTab)?.icon}
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                No {activeTab} assets found. Create your first asset to get started.
              </p>
            </div>
          ) : activeTab === 'headlines' || activeTab === 'descriptions' ? (
            <div className="space-y-2">
              {assetData.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 border border-surface-variant rounded-lg hover:bg-surface-container-low transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-body-md text-body-md text-on-surface [overflow-wrap:anywhere]">{a.text || a.name}</p>
                    {a.assetType && (
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{a.assetType}</p>
                    )}
                  </div>
                  <span className={`ml-3 px-2 py-1 rounded-full font-label-sm text-label-sm ${statusColors[a.status] || ''}`}>
                    {a.status || 'enabled'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {assetData.map((a) => (
                <div key={a.id} className="border border-surface-variant rounded-lg overflow-hidden hover:shadow-soft transition-shadow">
                  <div className="aspect-video bg-surface-container-low flex items-center justify-center">
                    {a.url && a.url !== '#' ? (
                      <img src={a.url} alt={a.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30">{TABS.find((t) => t.id === activeTab)?.icon}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="break-words text-sm font-medium text-on-surface">{a.name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                      {a.width && a.height && `${a.width} × ${a.height}px`}
                      {a.type && ` • ${a.type}`}
                    </p>
                    <span className={`mt-2 inline-block px-2 py-1 rounded-full font-label-sm text-label-sm ${statusColors[a.status] || ''}`}>
                      {a.status || 'enabled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
