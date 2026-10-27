import { useEffect, useState } from 'react'

export default function Toast({ message, type = 'info', duration = 4000, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose?.(), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const typeStyles = {
    success: 'bg-surface-container-high text-on-surface border border-surface-variant',
    error: 'bg-error-container text-on-error border border-error',
    info: 'bg-surface-container-high text-on-surface-variant border border-surface-variant',
    warning: 'bg-tertiary-container text-on-tertiary border border-tertiary',
  }

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${typeStyles[type]} ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">{icons[type]}</span>
        <span className="font-body-md text-body-md">{message}</span>
        <button
          onClick={() => {
            setVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
          className="ml-2 hover:text-on-surface transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  )
}
