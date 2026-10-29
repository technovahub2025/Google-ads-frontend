import { useState, useEffect, useMemo } from 'react'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import { formatCurrency, formatNumber } from '../../utils/format.js'
import Toast from '../../components/google-ads/Toast.jsx'
import { GOOGLE_ADS_DEVELOPMENT_MODE } from '../../config/googleAdsConfig.js'

const simulateDevelopmentPayment = async () => {
  if (!GOOGLE_ADS_DEVELOPMENT_MODE) {
    throw new Error('A real payment gateway has not been configured.')
  }

  await new Promise((resolve) => setTimeout(resolve, 700))
  return { success: true, reference: `demo-payment-${Date.now()}` }
}

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

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

  const totalBudget = useMemo(() => budgets.reduce((sum, b) => sum + Number(b.amount || 0), 0), [budgets])
  const totalSpend = useMemo(() => budgets.reduce((sum, b) => sum + Number(b.currentSpend || 0), 0), [budgets])
  const totalRemaining = useMemo(() => budgets.reduce((sum, b) => sum + Number(b.remaining || 0), 0), [budgets])

  const handleAddBudget = (budget) => {
    setBudgets((current) => [budget, ...current])
    setIsAddModalOpen(false)
    setShowSuccessToast(true)
  }

  return (
    <div className="space-y-stack-lg">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-headline-md text-headline-md text-primary">Budgets</h2>
        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="text-sm text-on-surface-variant">
            Total: {formatCurrency(totalBudget)} | Spent: {formatCurrency(totalSpend)} | Remaining: {formatCurrency(totalRemaining)}
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Budget
          </button>
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
                  const monthlyEst = b.monthlyEstimate ?? b.amount * 30
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

      {isAddModalOpen && (
        <AddBudgetModal
          onCancel={() => setIsAddModalOpen(false)}
          onAdd={handleAddBudget}
        />
      )}

      {showSuccessToast && (
        <Toast
          message="Payment successful. Budget added successfully."
          type="success"
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </div>
  )
}

function AddBudgetModal({ onCancel, onAdd }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('Daily')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const numericAmount = Number(amount)
  const paymentAmount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Enter a budget name.')
      return
    }
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!paymentMethod) {
      setError('Select a payment method.')
      return
    }

    setIsProcessing(true)
    try {
      await simulateDevelopmentPayment()
      const dailyBudget = period === 'Daily' ? numericAmount : numericAmount / 30
      onAdd({
        id: `budget-demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        campaign: 'Unassigned',
        period,
        amount: dailyBudget,
        dailyBudget,
        monthlyEstimate: dailyBudget * 30,
        currentSpend: 0,
        remaining: dailyBudget,
        currency: '₹',
        currencyCode: 'INR',
        deliveryMethod: 'Standard',
        status: 'enabled',
        paymentMethod,
        paymentStatus: 'SIMULATED',
      })
    } catch (paymentError) {
      setError(paymentError.message || 'Payment simulation failed. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !isProcessing && onCancel()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-budget-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-surface-variant bg-surface-container-lowest shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-surface-variant p-5 sm:p-6">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Development Mode · payment is simulated</p>
            <h2 id="add-budget-title" className="mt-1 font-headline-md text-headline-md text-primary">Add Budget</h2>
          </div>
          <button type="button" disabled={isProcessing} onClick={onCancel} aria-label="Close Add Budget" className="rounded-lg px-2 py-1 text-xl text-on-surface-variant hover:bg-surface-container disabled:opacity-50">×</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 sm:p-6">
            <label className="block">
              <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">Budget Name</span>
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Enter a budget name" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">Amount</span>
                <div className="flex items-center rounded-lg border border-surface-variant bg-surface-container-low px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  <span className="mr-2 text-on-surface-variant">₹</span>
                  <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full bg-transparent py-2 text-on-surface outline-none" placeholder="0.00" />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">Budget Type</span>
                <select value={period} onChange={(event) => setPeriod(event.target.value)} className="w-full rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>Daily</option>
                  <option>Monthly</option>
                </select>
              </label>
            </div>

            <div>
              <span className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">Currency</span>
              <div className="rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-on-surface">INR · ₹</div>
            </div>

            <fieldset>
              <legend className="mb-2 font-label-sm text-label-sm text-on-surface-variant">Payment Method</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {[['CARD', 'Card'], ['UPI', 'UPI'], ['NET_BANKING', 'Net Banking']].map(([value, label]) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${paymentMethod === value ? 'border-primary bg-primary/5 text-primary' : 'border-surface-variant text-on-surface'}`}>
                    <input type="radio" name="budget-payment-method" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} className="accent-primary" />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">No payment details are collected. This selection is for the local demo only.</p>
            </fieldset>

            <div className="rounded-xl border border-surface-variant bg-surface-container-low p-4">
              <h3 className="font-label-md text-label-md text-on-surface">Payment Summary</h3>
              <div className="mt-3 flex items-center justify-between border-t border-surface-variant pt-3 font-medium text-on-surface">
                <span>Amount to Pay</span>
                <span>{formatCurrency(paymentAmount, '₹')}</span>
              </div>
            </div>

            {error && <div role="alert" className="rounded-lg border border-error bg-error-container px-3 py-2 text-sm text-on-error">{error}</div>}
          </div>

          <footer className="flex flex-wrap justify-end gap-3 border-t border-surface-variant p-4 sm:px-6">
            <button type="button" onClick={onCancel} disabled={isProcessing} className="rounded-lg border border-surface-variant px-4 py-2 font-label-md text-label-md text-on-surface disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isProcessing} className="flex min-w-44 items-center justify-center rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">{isProcessing ? 'Processing payment...' : 'Pay & Add Budget'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
