'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { queryClient } from '../lib/queryClient'

// Wraps every route (via the root layout) — /login and the authenticated
// app shell both need AuthContext, and only one QueryClient should exist
// for the whole app.
function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

export default Providers
