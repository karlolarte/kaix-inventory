import Skeleton from './Skeleton'

interface SkeletonRowProps {
  /** Size classes for the leading image placeholder, e.g. "size-11". */
  avatarClassName?: string
  /** Width class for the subtitle line under the title, or `null` to omit it. */
  subtitleWidth?: string | null
  /** Width class for each trailing pill/button placeholder on the right. */
  trailing?: string[]
}

// The list-row shape shared by Designs, Raw Materials, Screen Rack, DTF
// Prints, and Print Runs — an image, a title/subtitle block, and a handful
// of right-aligned pills or buttons — so their loading state doesn't just
// pause on a spinner where a row of real content is about to appear.
function SkeletonRow({
  avatarClassName = 'size-11',
  subtitleWidth = 'w-24',
  trailing = ['w-20', 'w-16'],
}: SkeletonRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <Skeleton className={`shrink-0 ${avatarClassName}`} />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        {subtitleWidth && <Skeleton className={`h-3 ${subtitleWidth}`} />}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {trailing.map((width, index) => (
          <Skeleton key={index} className={`h-7 ${width} rounded-md`} />
        ))}
      </div>
    </div>
  )
}

export default SkeletonRow
