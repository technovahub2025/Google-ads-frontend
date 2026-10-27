export default function AccountSelector({ accounts = [], selected, onChange, loading = false }) {
  return (
    <div className="flex items-center gap-3">
      <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="account-selector">
        Account:
      </label>
      <select
        id="account-selector"
        value={selected || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className={`bg-surface-container-low border border-surface-variant text-on-surface font-label-md text-label-md rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
          loading ? 'opacity-50 cursor-wait' : ''
        }`}
      >
        <option value="" disabled>
          Select an account
        </option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name} ({acc.currency})
          </option>
        ))}
      </select>
    </div>
  )
}
