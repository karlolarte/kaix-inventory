import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  confirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const EXIT_DURATION_MS = 160

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [closing, setClosing] = useState(false)

  const requestCancel = () => {
    if (closing || confirming) return
    setClosing(true)
    window.setTimeout(onCancel, EXIT_DURATION_MS)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing, confirming])

  const isDanger = tone === 'danger'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={requestCancel}
        className={`fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 ${
          closing ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}
      />
      <div
        className={`relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${
          closing ? 'animate-dialog-out' : 'animate-dialog-in'
        }`}
      >
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-full ${
            isDanger
              ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
              : 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400'
          }`}
        >
          <AlertTriangle className="size-7" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{message}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={requestCancel}
            disabled={confirming}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-slate-900 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
            }`}
          >
            {confirming && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
