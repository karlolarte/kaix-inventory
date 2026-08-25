'use client'

import { Send, Shirt, TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  useDtfPrintOrders,
  useFinishedGoods,
  usePrintRuns,
  useRawMaterials,
} from '../../hooks/useInventory'
import { api } from '../../lib/api'
import type { DtfPrintOrder, RawMaterial } from '../../types/api'
import { hrefFor } from '../../lib/navigation'
import AsyncState from '../ui/AsyncState'
import Skeleton from '../ui/Skeleton'
import SkeletonStatCard from '../ui/SkeletonStatCard'
import Toast from '../ui/Toast'
import StatCard from '../ui/StatCard'
import DtfOrdersPanel from './DtfOrdersPanel'
import LowStockPanel from './LowStockPanel'
import QuickActionsBar from './QuickActionsBar'
import RecentActivityPanel from './RecentActivityPanel'
import RevenueSnapshotPanel from './RevenueSnapshotPanel'
import TopSellingDesigns from './TopSellingDesigns'

// A panel box's shared shape (icon + title + "View all" up top, a handful
// of rows below) — reused for every card in the dashboard's panel grid.
function SkeletonPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-md" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardHomeSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>

      <div>
        <Skeleton className="mb-3 h-3 w-24" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonPanel key={index} />
        ))}
      </div>
    </>
  )
}

function DashboardHome() {
  const router = useRouter()
  const onNavigate = (key: Parameters<typeof hrefFor>[0]) => router.push(hrefFor(key))
  const { data: rawMaterials, loading: materialsLoading, error: materialsError, refetch: refetchMaterials } = useRawMaterials()
  const { data: printRuns, loading: printRunsLoading, error: printRunsError } = usePrintRuns()
  const { data: finishedGoods, loading: finishedGoodsLoading, error: finishedGoodsError } = useFinishedGoods()
  const {
    data: dtfOrders,
    loading: dtfOrdersLoading,
    error: dtfOrdersError,
    refetch: refetchDtfOrders,
  } = useDtfPrintOrders()

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [dtfPendingIds, setDtfPendingIds] = useState<Set<string>>(new Set())
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const lowStock = useMemo(
    () => (rawMaterials ?? []).filter((item) => item.quantity <= item.reorderLevel),
    [rawMaterials],
  )
  const rawGarmentCount = useMemo(
    () =>
      (rawMaterials ?? [])
        .filter((item) => item.category.name.toLowerCase().includes('apparel'))
        .reduce((sum, item) => sum + item.quantity, 0),
    [rawMaterials],
  )
  const finishedGoodsCount = useMemo(
    () => (finishedGoods ?? []).reduce((sum, item) => sum + item.quantityOnHand, 0),
    [finishedGoods],
  )
  const dtfPending = useMemo(
    () => (dtfOrders ?? []).filter((order) => !order.ordered),
    [dtfOrders],
  )

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 2600)
  }

  const handleQuickRestock = async (item: RawMaterial) => {
    setPendingIds((prev) => new Set(prev).add(item.id))
    const restockQuantity = item.reorderLevel + Math.max(10, Math.round(item.reorderLevel * 0.3))

    try {
      await api.patch(`/raw-materials/${item.id}`, { quantity: restockQuantity })
      showToast(`Restocked ${item.name} to ${restockQuantity} ${item.unit ?? ''}.`.trim() + '.')
      refetchMaterials()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Restock failed. Please try again.')
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handleQuickMarkOrdered = async (order: DtfPrintOrder) => {
    setDtfPendingIds((prev) => new Set(prev).add(order.id))
    try {
      await api.patch(`/dtf-print-orders/${order.id}`, { ordered: true })
      showToast(`Marked ${order.colorway.shirtDesign.designName} (${order.colorway.colorwayName}) as ordered.`)
      refetchDtfOrders()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update. Please try again.')
    } finally {
      setDtfPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(order.id)
        return next
      })
    }
  }

  const loading = materialsLoading || printRunsLoading || finishedGoodsLoading || dtfOrdersLoading
  const error = materialsError ?? printRunsError ?? finishedGoodsError ?? dtfOrdersError

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shop Floor Overview</h2>
        <p className="mt-1 text-sm text-slate-500">
          Live snapshot of raw materials, finished inventory, and DTF orders.
        </p>
      </div>

      {(loading || error) && (
        <AsyncState
          loading={loading}
          error={error}
          loadingLabel="Loading shop floor data..."
          skeleton={<DashboardHomeSkeleton />}
        />
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Low Stock Alerts"
              value={lowStock.length}
              icon={TriangleAlert}
              tone="red"
              hint={`${lowStock.length} item${lowStock.length === 1 ? '' : 's'} at or below reorder level`}
              highlight={lowStock.length > 0}
            />
            <StatCard
              label="Raw Garments On-Hand"
              value={rawGarmentCount.toLocaleString()}
              icon={Shirt}
              tone="emerald"
              hint="Blank shirts across all sizes and colors"
            />
            <StatCard
              label="Finished Goods On-Hand"
              value={finishedGoodsCount.toLocaleString()}
              icon={Shirt}
              tone="sky"
              hint="Printed, ready-to-sell stock across all designs"
            />
            <StatCard
              label="DTF Prints To Order"
              value={dtfPending.length}
              icon={Send}
              tone="amber"
              hint={`${dtfPending.length} file${dtfPending.length === 1 ? '' : 's'} not yet sent to the print partner`}
              highlight={dtfPending.length > 0}
            />
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick Actions
            </h3>
            <QuickActionsBar
              onAddRawStock={() => {
                onNavigate('raw-materials')
                showToast('Opening raw stock intake form...')
              }}
              onRegisterScreen={() => {
                onNavigate('screen-rack')
                showToast('Opening new screen registration...')
              }}
              onLogPrintRun={() => {
                onNavigate('print-runs')
                showToast('Opening print run log...')
              }}
              onAddDtfOrder={() => {
                onNavigate('dtf-prints')
                showToast('Opening DTF order list...')
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
            <LowStockPanel
              items={lowStock}
              pendingIds={pendingIds}
              onQuickRestock={handleQuickRestock}
              onViewAll={() => onNavigate('raw-materials')}
            />
            <RevenueSnapshotPanel onViewAll={() => onNavigate('sales')} />
            <TopSellingDesigns printRuns={printRuns ?? []} onViewAll={() => onNavigate('print-runs')} />
            <DtfOrdersPanel
              items={dtfPending}
              pendingIds={dtfPendingIds}
              onQuickMarkOrdered={handleQuickMarkOrdered}
              onViewAll={() => onNavigate('dtf-prints')}
            />
            <RecentActivityPanel onViewAll={() => onNavigate('activity-log')} />
          </div>
        </>
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default DashboardHome
