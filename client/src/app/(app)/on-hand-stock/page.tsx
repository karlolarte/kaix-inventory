'use client'

import OnHandStock from '../../../components/views/OnHandStock'
import { useSearchContext } from '../../../context/SearchContext'

function Page() {
  const { searchQuery } = useSearchContext()
  return <OnHandStock searchQuery={searchQuery} />
}

export default Page
