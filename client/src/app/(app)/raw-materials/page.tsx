'use client'

import RawMaterials from '../../../components/views/RawMaterials'
import { useSearchContext } from '../../../context/SearchContext'

function Page() {
  const { searchQuery } = useSearchContext()
  return <RawMaterials searchQuery={searchQuery} />
}

export default Page
