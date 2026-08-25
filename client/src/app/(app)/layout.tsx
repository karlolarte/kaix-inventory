'use client'

import { useState, type ReactNode } from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import Header from '../../components/layout/Header'
import Sidebar from '../../components/layout/Sidebar'
import { SearchProvider } from '../../context/SearchContext'
import { ThemeProvider } from '../../context/ThemeContext'

// Replaces the old AppShell — everything under this route group is the
// authenticated app (Sidebar + Header persist across page navigations
// instead of being switched by state), gated by ProtectedRoute.
function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <ProtectedRoute>
      <ThemeProvider>
        <SearchProvider>
          <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
              mobileOpen={mobileNavOpen}
              onCloseMobile={() => setMobileNavOpen(false)}
            />

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
              <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
              <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
            </div>
          </div>
        </SearchProvider>
      </ThemeProvider>
    </ProtectedRoute>
  )
}

export default AppLayout
