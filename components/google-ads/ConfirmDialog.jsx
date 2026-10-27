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
    danger: 'bg-error text-on-error hover:bg-error/90',
    warning: 'bg-warning text-on-warning-container hover:bg-warning/90',
    primary: 'bg-primary text-on-primary hover:bg-primary/90',
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
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
          <div className="flex-1">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-surface-variant text-on-surface-variant font-label-md text-label-md rounded-lg hover:bg-surface-container transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-colors ${variantStyles[variant]}`}
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
