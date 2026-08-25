import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
}

// proxy.ts already redirects an unauthenticated request to /login before a
// protected page even renders (the common case). This covers what proxy
// can't see: the cookie expiring or getting invalidated *while* already on
// a page — any API call's 401 response flips `user` to null via
// AuthContext's global handler, and this pushes the router the rest of the
// way, replacing the old "render LoginPage in place" fallback from before
// this app had real routes.
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
