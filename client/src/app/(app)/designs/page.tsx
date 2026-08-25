'use client'

import Designs from '../../../components/views/Designs'
import { useSearchContext } from '../../../context/SearchContext'

function Page() {
  const { searchQuery } = useSearchContext()
  return <Designs searchQuery={searchQuery} />
}

export default Page
