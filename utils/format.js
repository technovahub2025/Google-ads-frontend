export const formatCurrency = (value, currency = '₹') => {
  if (value == null) return '—'
  return `${currency} ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatNumber = (value) => {
  if (value == null) return '—'
  return Number(value).toLocaleString('en-IN')
}

export const formatPercent = (value, decimals = 2) => {
  if (value == null) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

export const formatDate = (dateString) => {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

export const formatDecimal = (value, maxDigits = 2) => {
  if (value == null) return '—'
  return Number(value).toFixed(maxDigits)
}
