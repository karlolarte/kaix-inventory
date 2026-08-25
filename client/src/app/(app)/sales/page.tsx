'use client'

import SalesRevenue from '../../../components/views/SalesRevenue'
import { useSearchContext } from '../../../context/SearchContext'

function Page() {
  const { searchQuery } = useSearchContext()
  return <SalesRevenue searchQuery={searchQuery} />
}

export default Page
