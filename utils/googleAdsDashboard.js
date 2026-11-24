export const normalizeCustomerId = (value) => String(value || '').replace(/-/g, '')

export function dashboardAccounts(rows) {
  const accounts = new Map()
  for (const row of rows) {
    const customer = row.customer || row.customer_client || row.customerClient || row
    const id = normalizeCustomerId(customer.id)
    if (!/^\d{10}$/.test(id) || customer.manager === true) continue
    accounts.set(id, {
      id,
      name: customer.descriptive_name || customer.descriptiveName || customer.name || `Customer ${id}`,
      currency: customer.currency_code || customer.currencyCode || customer.currency || '',
      timeZone: customer.time_zone || customer.timeZone || '',
    })
  }
  return [...accounts.values()]
}

export function campaignRows(rows) {
  return rows.map(({ campaign, campaign_budget, metrics = {} }) => {
    const cost = Number(metrics.cost_micros || 0) / 1_000_000
    const conversions = Number(metrics.conversions || 0)
    const conversionValue = Number(metrics.conversions_value ?? metrics.conversion_value ?? 0)
    return {
      id: String(campaign.id), name: campaign.name,
      type: campaign.advertising_channel_type,
      status: String(campaign.status || '').toLowerCase(),
      dailyBudget: Number(campaign_budget?.amount_micros || 0) / 1_000_000,
      impressions: Number(metrics.impressions || 0), clicks: Number(metrics.clicks || 0),
      interactions: Number(metrics.interactions || 0), conversions, conversionValue,
      cost, cpa: conversions ? cost / conversions : 0, roas: cost ? conversionValue / cost : 0,
      ctr: Number(metrics.ctr || 0) * 100,
      cpc: Number(metrics.average_cpc || 0) / 1_000_000,
    }
  })
}

export function dashboardKpis(campaigns) {
  const sum = (key) => campaigns.reduce((total, campaign) => total + campaign[key], 0)
  const totalSpend = sum('cost'), impressions = sum('impressions'), clicks = sum('clicks')
  const conversions = sum('conversions'), interactions = sum('interactions'), conversionValue = sum('conversionValue')
  return {
    totalSpend, impressions, clicks, conversions, conversionValue,
    ctr: impressions ? clicks / impressions * 100 : 0,
    cpc: clicks ? totalSpend / clicks : 0,
    conversionRate: interactions ? conversions / interactions * 100 : 0,
    costPerConversion: conversions ? totalSpend / conversions : 0,
    cpa: conversions ? totalSpend / conversions : 0,
    roas: totalSpend ? conversionValue / totalSpend : 0,
  }
}

const periodReport = (response, { connectionId, customerId, dateRange, startDate, endDate }) => {
  if (response?.success !== true || !Array.isArray(response.campaigns) || !Array.isArray(response.timeSeries) ||
      response.connectionId !== connectionId || normalizeCustomerId(response.customerId) !== customerId ||
      response.dateRange !== dateRange || (dateRange === 'custom' && (response.startDate !== startDate || response.endDate !== endDate))) {
    throw new Error('The dashboard response does not match the selected account and date range.')
  }
  const campaigns = campaignRows(response.campaigns)
  return { campaigns, overview: dashboardKpis(campaigns), timeSeries: response.timeSeries.map((point) => point.conversionValue === undefined ? point : { ...point, conversionValue: Number(point.conversionValue || 0) }) }
}

export function dashboardReport(response, selection) {
  const report = periodReport(response, selection)
  if (response.previousPeriod) {
    const previous = response.previousPeriod
    const previousSelection = { ...selection, dateRange: previous.dateRange, startDate: previous.startDate, endDate: previous.endDate }
    report.previousPeriod = periodReport({ ...previous, success: true, connectionId: selection.connectionId, customerId: selection.customerId }, previousSelection)
  }
  return report
}
