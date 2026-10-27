import { useState, useEffect } from 'react'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { mockAssets } from '../../data/googleAdsMockData.js'

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

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await googleAdsApi.getAssets()
        setAssets(res.data || mockAssets)
      } catch (err) {
        console.error(err)
        setAssets(mockAssets)
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [])

  const currentData = assets?.[activeTab] || []
  const assetData = Array.isArray(currentData) ? currentData : []

  return (
    <div className="space-y-stack-lg">
      <h2 className="font-headline-md text-headline-md text-primary">Assets</h2>

      <div className="border-b border-surface-variant">
        <nav className="flex flex-wrap -mb-px gap-2" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-label-md text-label-md border-b-3 transition-all ${
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

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft overflow-hidden">
        <div className="p-4 border-b border-surface-variant flex justify-between items-center">
          <h3 className="font-headline-sm text-headline-sm text-primary capitalize">{TABS.find((t) => t.id === activeTab)?.label} Assets</h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {assetData.length} asset{assetData.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-surface-container-low rounded-lg p-4 animate-pulse h-32"></div>
              ))}
            </div>
          ) : assetData.length === 0 ? (
            <div className="text-center py-12">
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
                  <div className="flex-1">
                    <p className="font-body-md text-body-md text-on-surface break-all">{a.text || a.name}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
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
                    <p className="font-label-md text-label-md text-on-surface font-medium">{a.name}</p>
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
