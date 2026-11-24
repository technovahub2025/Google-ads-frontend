import { useState, useEffect, useMemo } from 'react'
import { googleAdsApi } from '../../services/googleAdsApi.js'
import PerformanceChart from '../../components/google-ads/PerformanceChart.jsx'
import DateRangeSelector from '../../components/google-ads/DateRangeSelector.jsx'
import Toast from '../../components/google-ads/Toast.jsx'
import { formatCurrency, formatNumber } from '../../utils/format.js'
import { mockReports, mockTimeSeriesData } from '../../data/googleAdsMockData.js'
import * as cacheModule from '../../services/googleAdsCache.js'
const readGoogleAdsCache = (...args) => cacheModule.readGoogleAdsCache?.(...args)
const writeGoogleAdsCache = (...args) => cacheModule.writeGoogleAdsCache?.(...args)
import { useGoogleAdsAccount } from '../../context/GoogleAdsAccountContext.jsx'

function exportToCSV(rows, filename) {
  if (!rows || rows.length === 0) return

  const headers = Object.keys(rows[0])
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h]
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '')
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportToExcel(rows, filename) {
  if (!rows || rows.length === 0) return

  const headers = Object.keys(rows[0])
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns="text/html">
    <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorksheet><x:ExcelWorksheetName>Reports</x:ExcelWorksheet></x:Worksheet></x:ExcelWorksheet></xml><![endif]--></head>
    <body><table border="1"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('last_30_days')
  const [showToast, setShowToast] = useState(false)
  const { selected } = useGoogleAdsAccount()
  const cacheKey = `page:reports:${selected?.key || 'none'}:${dateRange}`

  useEffect(() => {
    const fetchReports = async () => {
      const cached = readGoogleAdsCache(cacheKey)
      if (cached) { setReports(cached); setLoading(false) }
      else setLoading(true)
      try {
        const res = await googleAdsApi.getReports(dateRange, selected)
        const next = res.data || mockReports
        writeGoogleAdsCache(cacheKey, next); setReports(next)
      } catch (err) {
        console.error(err)
        setReports(mockReports)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [dateRange, selected])

  const summaryRows = useMemo(() => {
    if (!reports?.performanceSummary) return []
    return reports.performanceSummary.map((r) => ({
      Date: r.date,
      Spend: formatCurrency(r.spend),
      Impressions: formatNumber(r.impressions),
      Clicks: formatNumber(r.clicks),
      Conversions: formatNumber(r.conversions),
      CTR: `${r.ctr}%`,
      CPC: formatCurrency(r.cpc),
    }))
  }, [reports])

  const campaignRows = useMemo(() => {
    if (!reports?.campaignPerformance) return []
    return reports.campaignPerformance.map((c) => ({
      Campaign: c.campaign,
      Impressions: formatNumber(c.impressions),
      Clicks: formatNumber(c.clicks),
      Conversions: formatNumber(c.conversions),
      Spend: formatCurrency(c.spend),
      CTR: `${c.ctr}%`,
      CPC: formatCurrency(c.cpc),
    }))
  }, [reports])

  const handleExportCSV = () => {
    exportToCSV(summaryRows, `google-ads-report-${dateRange}.csv`)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleExportExcel = () => {
    exportToExcel(campaignRows, `google-ads-campaigns-${dateRange}.xlsx`)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  if (loading) {
    return (
      <div className="ads-stack">
        <div className="h-8 bg-surface-container-low rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-60 bg-surface-container-low rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const dr = reports?.dateRange || { start: '2025-09-01', end: '2025-09-30' }

  return (
    <div className="ads-stack">
      <div className="ads-toolbar">
        <h2 className="ads-page-title">Reports</h2>
        <div className="ads-actions">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <button
            onClick={handleExportCSV}
            className="ads-button"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="ads-button ads-button--primary"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]">event</span>
        Showing data from {dr.start} to {dr.end}
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
        <div className="ads-card ads-card-padding break-words tabular-nums">
          <h3 className="ads-metric-label mb-2">Total Spend</h3>
          <p className="ads-metric-value">
            {formatCurrency(reports?.performanceSummary?.reduce((sum, r) => sum + r.spend, 0) || 0)}
          </p>
        </div>
        <div className="ads-card ads-card-padding break-words tabular-nums">
          <h3 className="ads-metric-label mb-2">Total Clicks</h3>
          <p className="ads-metric-value">
            {formatNumber(reports?.performanceSummary?.reduce((sum, r) => sum + r.clicks, 0) || 0)}
          </p>
        </div>
        <div className="ads-card ads-card-padding break-words tabular-nums">
          <h3 className="ads-metric-label mb-2">Total Impressions</h3>
          <p className="ads-metric-value">
            {formatNumber(reports?.performanceSummary?.reduce((sum, r) => sum + r.impressions, 0) || 0)}
          </p>
        </div>
        <div className="ads-card ads-card-padding break-words tabular-nums">
          <h3 className="ads-metric-label mb-2">Total Conversions</h3>
          <p className="ads-metric-value">
            {formatNumber(reports?.performanceSummary?.reduce((sum, r) => sum + r.conversions, 0) || 0)}
          </p>
        </div>
      </div>

      <PerformanceChart
        title="Performance Summary"
        labels={reports?.performanceSummary?.map((r) => r.date) || mockTimeSeriesData.dates}
        datasets={[
          {
            key: 'spend',
            label: 'Spend',
            data: reports?.performanceSummary?.map((r) => r.spend) || mockTimeSeriesData.spend,
            borderColor: '#4285F4',
          },
          {
            key: 'clicks',
            label: 'Clicks',
            data: reports?.performanceSummary?.map((r) => r.clicks) || mockTimeSeriesData.clicks,
            borderColor: '#4285f4',
          },
          {
            key: 'conversions',
            label: 'Conversions',
            data: reports?.performanceSummary?.map((r) => r.conversions) || mockTimeSeriesData.conversions,
            borderColor: '#34a853',
          },
        ]}
        loading={false}
      />

      <div className="ads-card">
        <div className="ads-card-header">
          <h3 className="ads-section-title">Campaign Performance</h3>
        </div>
        <div className="ads-table-scroll" tabIndex={0} role="region" aria-label="Campaign performance">
          <table className="ads-table min-w-[680px] tabular-nums">
            <thead>
              <tr>
                <th className="font-medium">Campaign</th>
                <th className="ads-number">Impr.</th>
                <th className="ads-number">Clicks</th>
                <th className="ads-number">Conversions</th>
                <th className="ads-number">Spend</th>
                <th className="ads-number">CTR</th>
                <th className="ads-number">CPC</th>
              </tr>
            </thead>
            <tbody>
              {campaignRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-on-surface-variant">
                    No report data available for the selected period.
                  </td>
                </tr>
              ) : (
                campaignRows.map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium text-blue-800">{row.Campaign}</td>
                    <td className="ads-number">{row.Impressions}</td>
                    <td className="ads-number">{row.Clicks}</td>
                    <td className="ads-number">{row.Conversions}</td>
                    <td className="ads-number">{row.Spend}</td>
                    <td className="ads-number">{row.CTR}</td>
                    <td className="ads-number">{row.CPC}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showToast && (
        <Toast
          message="Report exported successfully."
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
