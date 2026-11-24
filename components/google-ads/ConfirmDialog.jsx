import { Fragment } from 'react'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) {
  if (!isOpen) return null

  const variantStyles = {
    danger: 'ads-button--danger',
    warning: 'border-warning/50 text-warning',
    primary: 'ads-button--primary',
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ads-card ads-card-padding mx-4 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {variant === 'danger' ? (
              <span className="material-symbols-outlined text-[32px] text-error">warning</span>
            ) : (
              <span className="material-symbols-outlined text-[32px] text-primary">help_outline</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="ads-section-title mb-2">{title}</h3>
            <p className="ads-description mb-5">{message}</p>
            <div className="ads-actions justify-end">
              <button
                type="button"
                onClick={onClose}
                className="ads-button"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`ads-button ${variantStyles[variant]}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
