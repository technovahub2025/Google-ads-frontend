import { useState, useRef, useEffect } from 'react'

const PRESET_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 14 days', value: 'last_14_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'Custom range', value: 'custom' },
]

export default function DateRangeSelector({ value = 'last_30_days', onChange, customRange = null }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = PRESET_RANGES.find((r) => r.value === value)?.label || 'Last 30 days'

  const handleSelect = (val) => {
    onChange?.(val)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block max-w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="ads-button"
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined text-[18px]">date_range</span>
        <span>{selectedLabel}</span>
        {customRange && (
          <span className="text-on-surface-variant">
            ({new Date(customRange.start).toLocaleDateString()} - {new Date(customRange.end).toLocaleDateString()})
          </span>
        )}
        <span className="material-symbols-outlined text-[16px] transition-transform">
          {isOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
        </span>
      </button>

      {isOpen && (
        <div className="ads-card absolute left-0 z-[100] mt-2 max-h-[50dvh] w-52 max-w-[calc(100vw-2rem)] overflow-y-auto p-1 shadow-lg sm:left-auto sm:right-0">
          {PRESET_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => handleSelect(range.value)}
              className={`min-h-9 w-full rounded-md px-3 py-2 text-left text-sm font-medium focus-visible:outline-offset-[-2px] motion-safe:transition-colors ${
                value === range.value
                  ? 'bg-secondary-container text-blue-800'
                  : 'text-slate-700 hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
