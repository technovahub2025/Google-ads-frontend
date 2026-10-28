export default function StatCard({
  title,
  value,
  subtitle = '',
  icon = 'analytics',
  iconBg = 'bg-primary',
  iconColor = 'text-on-primary',
  trend = null,
  currency = '',
  isCurrency = false,
  loading = false,
}) {
  const displayValue = isCurrency
    ? `${currency}${Number(value || 0).toLocaleString('en-IN')}`
    : Number(value || 0).toLocaleString('en-IN')

  const TrendIcon = trend?.direction === 'up' ? 'trending_up' : trend?.direction === 'down' ? 'trending_down' : 'trending_flat'
  const trendColor =
    trend?.direction === 'up'
      ? 'text-google-ads-green'
      : trend?.direction === 'down'
      ? 'text-google-ads-red'
      : 'text-on-surface-variant'

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-5 shadow-soft transition-all group">
      <div className="flex min-h-9 items-center justify-between gap-3 mb-3">
        <h3 className="font-label-md text-label-md text-on-surface-variant">{title}</h3>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconBg} ${iconColor}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-7 bg-surface-container-low rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-surface-container-low rounded w-1/2"></div>
        </div>
      ) : (
        <>
          <p className="font-headline-md text-headline-md text-on-surface font-semibold mb-1 break-words tabular-nums">
            {displayValue}
          </p>
          {subtitle && (
            <p className="font-label-sm text-label-sm text-on-surface-variant">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
              <span className="material-symbols-outlined text-[14px]">{TrendIcon}</span>
              <span className="font-label-sm text-label-sm font-medium">{trend.value}% vs last period</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
