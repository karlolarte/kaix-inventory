'use client'

import ActivityLog from '../../../components/views/ActivityLog'
import { useSearchContext } from '../../../context/SearchContext'

function Page() {
  const { searchQuery } = useSearchContext()
  return <ActivityLog searchQuery={searchQuery} />
}

export default Page
