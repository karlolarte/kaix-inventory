'use client'

import { useEffect } from 'react'

// Ported from main.tsx's `import.meta.env.PROD` guard — Next.js's equivalent
// is NODE_ENV, which is always "production" in a production build.
function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error)
      })
    }
  }, [])

  return null
}

export default ServiceWorkerRegister
