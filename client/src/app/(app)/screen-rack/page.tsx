'use client'

import ScreenRack from '../../../components/views/ScreenRack'
import { useSearchContext } from '../../../context/SearchContext'

function Page() {
  const { searchQuery } = useSearchContext()
  return <ScreenRack searchQuery={searchQuery} />
}

export default Page
