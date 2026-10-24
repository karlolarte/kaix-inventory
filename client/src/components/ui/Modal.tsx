import { X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'xl' | '2xl'
}

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-lg',
  xl: 'max-w-3xl',
  '2xl': 'max-w-5xl',
}

const EXIT_DURATION_MS = 160

function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
  const [closing, setClosing] = useState(false)

  // Close is deferred behind a local "closing" state so the dialog can play
  // its exit animation before the parent actually unmounts it — the parent
  // never needs to know this happens.
  const requestClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(onClose, EXIT_DURATION_MS)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={requestClose}
        className={`fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 ${
          closing ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}
      />
      <div
        className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${sizeClass[size]} ${
          closing ? 'animate-dialog-out' : 'animate-dialog-in'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export default Modal
