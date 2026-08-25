'use client'

import PrintRuns from '../../../components/views/PrintRuns'
import { useSearchContext } from '../../../context/SearchContext'

function Page() {
  const { searchQuery } = useSearchContext()
  return <PrintRuns searchQuery={searchQuery} />
}

export default Page
