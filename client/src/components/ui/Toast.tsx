import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ToastProps {
  message: string | null
}

const EXIT_DURATION_MS = 180

// Stays mounted regardless of `message` so it can play an exit animation
// before disappearing — callers just flip `message` to null on a timer and
// this handles the rest. Enter and exit share the same path (bottom edge)
// for spatial consistency.
function Toast({ message }: ToastProps) {
  const [displayMessage, setDisplayMessage] = useState(message)
  const [visible, setVisible] = useState(Boolean(message))

  useEffect(() => {
    if (message) {
      setDisplayMessage(message)
      setVisible(true)
      return
    }

    setVisible(false)
    const timeout = window.setTimeout(() => setDisplayMessage(null), EXIT_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [message])

  if (!displayMessage) return null

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-2xl shadow-slate-900/10 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/40 ${
        visible ? 'animate-toast-in' : 'animate-toast-out'
      }`}
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      {displayMessage}
    </div>
  )
}

export default Toast
