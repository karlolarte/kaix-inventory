import Skeleton from './Skeleton'

// Mirrors StatCard's exact box (rounded-xl border p-5, icon top-right, big
// number, hint line) so the stat grid on Sales & Revenue and the dashboard
// doesn't reflow when the real numbers pop in.
function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="size-10 shrink-0 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  )
}

export default SkeletonStatCard
