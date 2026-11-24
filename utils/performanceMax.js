
export const OBJECTIVES = {
  SALES: ['Sales', 'Drive purchases and revenue. Conversion value bidding is a good fit when your purchase actions record values.'],
  LEADS: ['Leads', 'Get more enquiries, sign-ups or calls. Conversion count bidding is a good starting point.'],
  OTHER: ['Other conversion goals', 'Optimize for other measurable actions, such as registrations or bookings.'],
}

export const STRATEGIES = {
  MAXIMIZE_CONVERSIONS: ['Maximize conversions', 'Get as many conversions as possible for your daily budget.'],
  MAXIMIZE_CONVERSION_VALUE: ['Maximize conversion value', 'Aim for the greatest total value from conversions for your daily budget.'],
}

export const FONTS = ['Open Sans', 'Roboto', 'Montserrat', 'Poppins', 'Lato', 'Oswald', 'Playfair Display', 'Roboto Slab']

export const STEPS = ['Objective', 'Campaign settings', 'Budget and bidding', 'Conversion goals', 'Asset groups', 'Audience signals', 'Additional settings', 'Review', 'Publish']
export const TEXT_FIELDS = {
  headlines: ['Headlines', 3, 15, 30],
  longHeadlines: ['Long headlines', 1, 5, 90],
  descriptions: ['Descriptions', 2, 5, 90],
}
export const IMAGE_FIELDS = {
  landscape: ['Landscape images', 1, 20, 600, 314, 1.91, '1.91:1'],
  square: ['Square images', 1, 20, 300, 300, 1, '1:1'],
  portrait: ['Portrait images', 0, 20, 480, 600, 0.8, '4:5'],
  logos: ['Square logos', 1, 5, 128, 128, 1, '1:1'],
  landscapeLogos: ['Landscape logos', 0, 4, 512, 128, 4, '4:1'],
}
export const IMAGE_LIMIT = 5 * 1024 * 1024
export const TOTAL_IMAGE_LIMIT = 24 * 1024 * 1024

export const splitLines = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean)
export const characterCount = (value) => [...value.trim()].length
const assetLength = (value) => [...value.trim()].reduce((length, character) =>
  length + (/[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\u3000\uFF01-\uFF60\uFFE0-\uFFE6]/u.test(character) ? 2 : 1), 0)
export const duplicate = (values) => new Set(values.map((value) => value.toLowerCase())).size !== values.length
export const groupDraft = () => ({
  key: crypto.randomUUID(), name: '', finalUrl: '', headlines: '', longHeadlines: '', descriptions: '',
  landscape: [], square: [], portrait: [], videos: '', audience: '', segments: [], themes: '',
})

export const campaignDraft = () => ({
  objective: '', name: '', startDate: '', endDate: '', locations: [], languages: [],
  locationMode: 'PRESENCE_OR_INTEREST', budgetAmount: '', biddingStrategy: 'MAXIMIZE_CONVERSIONS',
  targetCpa: '', targetRoas: '', goalMode: 'ACCOUNT', goals: [], conversionActions: [], businessName: '', logos: [],
  landscapeLogos: [], groups: [groupDraft()], urlExpansion: true, finalUrlSuffix: '', euPoliticalAdvertising: '',
  mainColor: '', accentColor: '', fontFamily: '',
})

export function youtubeId(value) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return ''
    let id
    if (url.hostname === 'youtu.be' && /^\/[^/]+\/?$/.test(url.pathname)) id = url.pathname.split('/')[1]
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)\/?$/)?.[1]
    }
    return /^[\w-]{11}$/.test(id || '') ? id : ''
  } catch { return '' }
}

const positiveMoney = (value) => /^\d+(?:\.\d{1,6})?$/.test(value) && Number(value) > 0 && Number(value) <= Number.MAX_SAFE_INTEGER / 1e6
const validUrl = (value) => {
  try {
    const url = new URL(value)
    return /^(https?):$/.test(url.protocol) && !url.username && !url.password && url.href.length <= 2048
  } catch { return false }
}
const widthFits = (width, height, specification) => {
  const [, , , minWidth, minHeight, ratio] = specification
  return width >= minWidth && height >= minHeight && Math.abs(width / height - ratio) <= ratio * 0.01
}
export async function readImage(file, field) {
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type) || file.size > IMAGE_LIMIT) {
    throw new Error(file.name + ' must be a JPG, PNG or GIF up to 5 MB.')
  }
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read ' + file.name))
    reader.readAsDataURL(file)
  })
  const image = new Image()
  image.src = source
  try { await image.decode() } catch { throw new Error(file.name + ' is not a readable image.') }
  if (!widthFits(image.naturalWidth, image.naturalHeight, IMAGE_FIELDS[field])) {
    throw new Error(file.name + ' does not meet the required dimensions and aspect ratio.')
  }
  return { name: file.name, source, size: file.size, width: image.naturalWidth, height: image.naturalHeight }
}

export function imageBytes(draft) {
  return [...draft.logos, ...draft.landscapeLogos, ...draft.groups.flatMap((group) => [...group.landscape, ...group.square, ...group.portrait])]
    .reduce((total, image) => total + image.size, 0)
}

export const goalEligible = (data, key) => data?.goals.some((goal) => goal.key === key) &&
  data.actions.some((action) => action.goalKey === key && action.status === 'ENABLED' && action.primary)

export function stepErrors(step, draft, catalogs = {}) {
  const errors = {}
  const validateText = (key, value, label, max) => {
    if (!characterCount(value) || characterCount(value) > max) errors[key] = label + ' is required and must be ' + max + ' characters or fewer.'
  }
  const validateImages = (key, images, field) => {
    const [label, min, max] = IMAGE_FIELDS[field]
    if (images.length < min || images.length > max) errors[key] = 'Add ' + min + ' to ' + max + ' ' + label.toLowerCase() + '.'
  }
  switch (step) {
    case 0:
      if (!OBJECTIVES[draft.objective]) errors.objective = 'Choose an objective.'
      break
    case 1:
      validateText('name', draft.name, 'Campaign name', 128)
      if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) errors.endDate = 'End date must be on or after the start date.'
      break
    case 2:
      if (!positiveMoney(draft.budgetAmount)) errors.budgetAmount = 'Enter a positive daily budget with up to six decimal places.'
      if (draft.biddingStrategy === 'MAXIMIZE_CONVERSIONS' && draft.targetCpa && !positiveMoney(draft.targetCpa)) errors.targetCpa = 'Enter a positive target CPA with up to six decimal places.'
      if (draft.biddingStrategy === 'MAXIMIZE_CONVERSION_VALUE' && draft.targetRoas && (!/^\d+(?:\.\d+)?$/.test(draft.targetRoas) || !Number.isFinite(Number(draft.targetRoas)) || Number(draft.targetRoas) <= 0)) errors.targetRoas = 'Enter a positive return on ad spend percentage.'
      break
    case 3:
      if (!catalogs.goals) errors.goals = 'Load the conversion goals for this account before continuing.'
      else if (draft.goalMode === 'ACCOUNT' && !catalogs.goals.goals.some((goal) => goal.biddable && goalEligible(catalogs.goals, goal.key))) errors.goals = 'Set up an enabled primary conversion action and a biddable default goal in Google Ads, or choose eligible campaign goals.'
      else if (draft.goalMode === 'ACTIONS' && (!catalogs.goals.canSelectActions || !draft.conversionActions.length || draft.conversionActions.some((id) => !catalogs.goals.actions.some((action) => action.id === id && action.status === 'ENABLED')))) errors.goals = 'Select at least one enabled conversion action.'
      else if (draft.goalMode === 'CAMPAIGN' && (!draft.goals.length || draft.goals.some((key) => !goalEligible(catalogs.goals, key)))) errors.goals = 'Select at least one eligible conversion goal.'
      break
    case 4:
      validateText('businessName', draft.businessName, 'Business name', 25)
      if (assetLength(draft.businessName) > 25) errors.businessName = 'Business name exceeds 25 characters. Double-width characters count as two.'
      for (const field of ['logos', 'landscapeLogos']) validateImages(field, draft[field], field)
      if (draft.logos.length + draft.landscapeLogos.length > 5) errors.landscapeLogos = 'Add no more than five logos across both formats.'
      if (imageBytes(draft) > TOTAL_IMAGE_LIMIT) errors.images = 'Images must total 24 MB or less per campaign.'
      for (const group of draft.groups) {
        const prefix = group.key + '.'
        validateText(prefix + 'name', group.name, 'Asset group name', 128)
        if (duplicate(draft.groups.map((item) => item.name.trim()))) errors[prefix + 'name'] = 'Use a unique asset group name.'
        if (!validUrl(group.finalUrl)) errors[prefix + 'finalUrl'] = 'Enter a valid HTTP or HTTPS URL without credentials.'
        for (const [key, [label, min, max, limit]] of Object.entries(TEXT_FIELDS)) {
          const lines = splitLines(group[key])
          if (lines.length < min || lines.length > max || lines.some((line) => assetLength(line) > limit) || duplicate(lines)) {
            errors[prefix + key] = 'Enter ' + min + ' to ' + max + ' unique ' + label.toLowerCase() + ', each up to ' + limit + ' characters.'
          }
        }
        for (const field of ['landscape', 'square', 'portrait']) validateImages(prefix + field, group[field], field)
        const videos = splitLines(group.videos).map(youtubeId)
        if (videos.length > 15 || videos.some((id) => !id) || duplicate(videos)) errors[prefix + 'videos'] = 'Enter up to 15 unique YouTube URLs, one per line.'
      }
      break
    case 5:
      for (const group of draft.groups) {
        const themes = splitLines(group.themes)
        if (themes.length > 50 || themes.some((line) => characterCount(line) > 80) || duplicate(themes)) {
          errors[group.key + '.themes'] = 'Enter up to 50 unique search themes, each up to 80 characters.'
        }
      }
      break
    case 6:
      if ((draft.mainColor || draft.accentColor) && ![draft.mainColor, draft.accentColor].every((color) => /^#[0-9a-f]{6}$/i.test(color.trim()))) errors.brandColors = 'Enter both a main and an accent color as six-digit hex values.'
      if (!draft.euPoliticalAdvertising) errors.euPoliticalAdvertising = 'Choose the EU political advertising declaration.'
      if (draft.finalUrlSuffix.trim() && !/^[^?&#\s=]+=[^&#\s]*(?:&[^?&#\s=]+=[^&#\s]*)*$/.test(draft.finalUrlSuffix.trim())) {
        errors.finalUrlSuffix = 'Enter tracking parameters without a leading question mark.'
      }
      break
  }
  return errors
}

export function campaignPayload(draft) {
  const imageData = (items) => items.map((item) => item.source.slice(item.source.indexOf(',') + 1))
  return {
    campaignType: 'PERFORMANCE_MAX', status: 'PAUSED', objective: draft.objective, name: draft.name.trim(),
    startDate: draft.startDate, endDate: draft.endDate, locationMode: draft.locationMode,
    locationIds: draft.locations.map((location) => location.id), languageIds: draft.languages,
    budgetAmount: draft.budgetAmount, biddingStrategy: draft.biddingStrategy,
    targetCpa: draft.biddingStrategy === 'MAXIMIZE_CONVERSIONS' ? draft.targetCpa : '',
    targetRoas: draft.biddingStrategy === 'MAXIMIZE_CONVERSION_VALUE' ? draft.targetRoas : '',
    goalMode: draft.goalMode, goals: draft.goalMode === 'CAMPAIGN' ? draft.goals : [],
    conversionActions: draft.goalMode === 'ACTIONS' ? draft.conversionActions : [],
    businessName: draft.businessName.trim(), logos: imageData(draft.logos), landscapeLogos: imageData(draft.landscapeLogos),
    mainColor: draft.mainColor.trim(), accentColor: draft.accentColor.trim(), fontFamily: draft.fontFamily,
    urlExpansion: draft.urlExpansion, finalUrlSuffix: draft.finalUrlSuffix.trim(), euPoliticalAdvertising: draft.euPoliticalAdvertising,
    groups: draft.groups.map((group) => ({
      name: group.name.trim(), finalUrl: group.finalUrl.trim(), headlines: splitLines(group.headlines),
      longHeadlines: splitLines(group.longHeadlines), descriptions: splitLines(group.descriptions),
      landscape: imageData(group.landscape), square: imageData(group.square), portrait: imageData(group.portrait),
      videos: splitLines(group.videos).map(youtubeId), audience: group.audience, segments: group.segments, themes: splitLines(group.themes),
    })),
  }
}
