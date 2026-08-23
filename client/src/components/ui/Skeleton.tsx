interface SkeletonProps {
  className?: string
}

// Base shimmering block — compose into page-specific loading placeholders
// (SkeletonRow, SkeletonStatCard, and the `*Skeleton` components colocated
// with each view) so a page's loading state roughly matches its real
// content's shape instead of just pausing on a spinner.
function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />
}

export default Skeleton
