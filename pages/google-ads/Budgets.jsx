import { useState, useEffect, useMemo } from 'react'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { formatCurrency, formatNumber } from '../../utils/format.js'

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

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const res = await googleAdsApi.getBudgets()
        setBudgets(res.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchBudgets()
  }, [])

  const filtered = useMemo(() => {
    return budgets.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.campaign?.toLowerCase().includes(search.toLowerCase())
    )
  }, [budgets, search])

  const totalBudget = useMemo(() => filtered.reduce((sum, b) => sum + b.amount, 0), [filtered])
  const totalSpend = useMemo(() => filtered.reduce((sum, b) => sum + b.currentSpend, 0), [filtered])
  const totalRemaining = useMemo(() => filtered.reduce((sum, b) => sum + b.remaining, 0), [filtered])

  return (
    <div className="space-y-stack-lg">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-headline-md text-headline-md text-primary">Budgets</h2>
        <div className="text-sm text-on-surface-variant">
          Total: {formatCurrency(totalBudget)} | Spent: {formatCurrency(totalSpend)} | Remaining: {formatCurrency(totalRemaining)}
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search budgets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 bg-surface-container-low border border-surface-variant text-on-surface font-body-md text-body-md rounded-xl pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
        />
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-5 shadow-soft">
          <h3 className="font-label-md text-label-md text-on-surface-variant mb-2">Total Budget</h3>
          <p className="font-headline-md text-headline-md text-primary font-semibold">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-5 shadow-soft">
          <h3 className="font-label-md text-label-md text-on-surface-variant mb-2">Total Spent</h3>
          <p className="font-headline-md text-headline-md text-primary font-semibold">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-5 shadow-soft">
          <h3 className="font-label-md text-label-md text-on-surface-variant mb-2">Total Remaining</h3>
          <p className="font-headline-md text-headline-md text-primary font-semibold">{formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Budget Name</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium text-right">Daily Budget</th>
                <th className="px-4 py-3 font-medium text-right">Monthly Est.</th>
                <th className="px-4 py-3 font-medium text-right">Current Spend</th>
                <th className="px-4 py-3 font-medium text-right">Remaining</th>
                <th className="px-4 py-3 font-medium">Delivery</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant font-body-md text-body-md">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map(((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-container-low rounded animate-pulse"></div>
                      </td>
                    )))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-on-surface-variant">
                    No budgets found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const pct = b.amount > 0 ? ((b.currentSpend / b.amount) * 100).toFixed(1) : 0
                  const monthlyEst = b.amount * 30
                  return (
                    <tr key={b.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-primary">{b.name}</td>
                      <td className="px-4 py-3">{b.campaign || '—'}</td>
                      <td className="px-4 py-3">{b.period}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(b.amount, b.currency)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(monthlyEst, b.currency)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(b.currentSpend, b.currency)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(b.remaining, b.currency)}</td>
                      <td className="px-4 py-3">{b.deliveryMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm border ${statusColors[b.status] || ''}`}>
                          {statusLabels[b.status] || b.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
