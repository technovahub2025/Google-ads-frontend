import * as XLSX from 'xlsx'

const sensitiveKey = /token|secret|password|credential|authorization|cookie/i
const preferredKeys = [
  'leadId', 'contact.name', 'contact.email', 'contact.phone', 'customerId',
  'campaignId', 'adGroupId', 'formId', 'creativeId', 'assetGroupId',
  'submittedAt', 'receivedAt', 'updatedAt', 'status', 'leadStage',
  'leadSource', 'source', 'provider', 'gclId', 'isTest', 'needsReview',
  'whatsappConsent',
]

const dateKeys = /(?:date|At)$/i

const asDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === 'function') return asDate(value.toDate())
  if (typeof value === 'object' && Number.isFinite(value._seconds)) return new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6))
  if (typeof value === 'object' && Number.isFinite(value.seconds)) return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6))
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const flatten = (value, prefix, output) => {
  if (value === null || value === undefined) return
  if (sensitiveKey.test(prefix)) return
  if (value instanceof Date || (typeof value === 'object' && (value._seconds !== undefined || value.seconds !== undefined))) {
    output[prefix] = asDate(value)
    return
  }
  if (Array.isArray(value)) {
    output[prefix] = value.map((item) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ')
    return
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key, output))
    return
  }
  output[prefix] = value
}

const labelFor = (key) => key.split('.').map((part) => part.replace(/([a-z])([A-Z])/g, '$1 $2')).join(' / ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export const createLeadExportRows = (leads = []) => {
  const flattened = leads.map((lead) => {
    const row = {}
    flatten(lead, '', row)
    return row
  })
  const keys = [...preferredKeys, ...flattened.flatMap((row) => Object.keys(row))]
    .filter((key, index, all) => all.indexOf(key) === index && !sensitiveKey.test(key))
  const headers = keys.map(labelFor)
  const rows = flattened.map((row) => keys.map((key) => {
    const value = row[key]
    if (value instanceof Date) return value
    if (dateKeys.test(key) && value) return asDate(value) || value
    return value ?? ''
  }))
  return { headers, rows }
}

const csvValue = (value) => {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const createLeadCsv = (leads) => {
  const { headers, rows } = createLeadExportRows(leads)
  return [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n') + '\r\n'
}

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const downloadLeadsCsv = (leads, filename) => download(new Blob([createLeadCsv(leads)], { type: 'text/csv;charset=utf-8' }), filename)

export const createLeadXlsx = (leads) => {
  const { headers, rows } = createLeadExportRows(leads)
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  sheet['!cols'] = headers.map((header, index) => ({ wch: Math.min(Math.max(header.length + 2, 14), index === 0 ? 26 : 34) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Google Ads Leads')
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellDates: true })
}

export const downloadLeadsXlsx = (leads, filename) => download(new Blob([createLeadXlsx(leads)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
