'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface SearchContextValue {
  searchQuery: string
  setSearchQuery: (value: string) => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

// One search box in the Header, shared across whichever page is active —
// same "search persists as you switch views" behavior as when this lived as
// plain useState in AppShell, just provided at the routed layout level now.
export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearchContext(): SearchContextValue {
  const context = useContext(SearchContext)
  if (!context) throw new Error('useSearchContext must be used within a SearchProvider')
  return context
}
