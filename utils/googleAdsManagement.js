export const MANAGEMENT = {
  campaigns: { title: 'Campaigns', path: 'campaigns', list: 'campaigns/settings', id: 'campaignId' },
  budgets: { title: 'Budgets', path: 'campaign-budgets', list: 'campaign-budgets', id: 'budgetId' },
  adGroups: { title: 'Ad Groups', path: 'ad-groups', list: 'ad-groups', id: 'adGroupId' },
  ads: { title: 'Ads', path: 'ads', list: 'ads', id: 'adId' },
  keywords: { title: 'Keywords', path: 'keywords', list: 'keywords', id: 'keywordId' },
}

export function managementRows(kind, rows, campaigns = []) {
  return rows.map((row) => {
    const parent = { campaignId: String(row.campaign?.id || ''), campaignName: row.campaign?.name || '', adGroupId: String(row.ad_group?.id || ''), adGroupName: row.ad_group?.name || '' }
    if (kind === 'campaigns') {
      const value = row.campaign
      return { ...parent, id: String(value.id), name: value.name, status: value.status, type: value.advertising_channel_type, biddingStrategy: value.bidding_strategy_type, budgetId: String(row.campaign_budget?.id || ''), amount: Number(row.campaign_budget?.amount_micros || 0) / 1e6, startDate: value.start_date_time?.slice(0, 10), endDate: value.end_date_time?.slice(0, 10), supported: value.advertising_channel_type === 'SEARCH', canChangeStatus: ['SEARCH', 'PERFORMANCE_MAX'].includes(value.advertising_channel_type) }
    }
    if (kind === 'budgets') {
      const value = row.campaign_budget
      return { id: String(value.id), name: value.name, status: value.status, period: value.period, deliveryMethod: value.delivery_method, amount: Number(value.period === 'DAILY' ? value.amount_micros || 0 : value.total_amount_micros || 0) / 1e6, campaignName: campaigns.filter((item) => String(item.campaign_budget?.id) === String(value.id)).map((item) => item.campaign.name).join(', '), supported: value.period === 'DAILY' }
    }
    if (kind === 'adGroups') {
      const value = row.ad_group
      return { ...parent, id: String(value.id), name: value.name, status: value.status, type: value.type, biddingStrategy: row.campaign?.bidding_strategy_type, cpcBid: Number(value.cpc_bid_micros || 0) / 1e6, supported: row.campaign?.advertising_channel_type === 'SEARCH' && value.type === 'SEARCH_STANDARD' }
    }
    if (kind === 'ads') {
      const value = row.ad_group_ad.ad
      return { ...parent, id: String(value.id), name: value.responsive_search_ad?.headlines?.[0]?.text || `Ad ${value.id}`, status: row.ad_group_ad.status, type: value.type, headlines: value.responsive_search_ad?.headlines?.map((item) => item.text) || [], descriptions: value.responsive_search_ad?.descriptions?.map((item) => item.text) || [], finalUrl: value.final_urls?.[0] || '', supported: value.type === 'RESPONSIVE_SEARCH_AD' && row.campaign?.advertising_channel_type === 'SEARCH' }
    }
    const value = row.ad_group_criterion
    return { ...parent, id: String(value.criterion_id), name: value.keyword.text, status: value.status, matchType: value.keyword.match_type, supported: true }
  })
}

export function managementPayload(kind, form, editing) {
  const value = { ...form }
  if (kind === 'campaigns' && editing) delete value.startDate
  if (kind === 'ads') for (const field of ['headlines', 'descriptions']) value[field] = String(form[field] || '').split('\n').map((item) => item.trim()).filter(Boolean)
  return value
}
