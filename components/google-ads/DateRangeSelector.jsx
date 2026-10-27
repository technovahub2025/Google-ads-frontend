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
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-surface-container-low border border-surface-variant text-on-surface font-label-md text-label-md rounded-lg px-3 py-2 hover:bg-surface-container transition-colors"
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
        <div className="absolute left-0 mt-2 w-52 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-lg z-[100] py-1">
          {PRESET_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => handleSelect(range.value)}
              className={`w-full text-left px-4 py-2 font-label-md text-label-md transition-colors ${
                value === range.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
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
