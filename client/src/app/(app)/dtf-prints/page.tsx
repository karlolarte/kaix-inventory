'use client'

import DtfPrints from '../../../components/views/DtfPrints'
import { useSearchContext } from '../../../context/SearchContext'

function Page() {
  const { searchQuery } = useSearchContext()
  return <DtfPrints searchQuery={searchQuery} />
}

export default Page
