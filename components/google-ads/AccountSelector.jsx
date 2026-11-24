export default function AccountSelector({ accounts = [], selected, onChange, loading = false }) {
  return (
    <div className="ads-actions">
      <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="account-selector">
        Account:
      </label>
      <select
        id="account-selector"
        value={selected || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className={`ads-control w-auto ${
          loading ? 'opacity-50 cursor-wait' : ''
        }`}
     >
        <option value="" disabled>
          Select an account
        </option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name} · {acc.id}{acc.currency ? ` (${acc.currency})` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
