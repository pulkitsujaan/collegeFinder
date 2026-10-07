/**
 * Skeletons, not spinners. A shimmering block that matches the shape of the
 * content it replaces keeps the page from jumping when the data lands.
 */
export function Skeleton({ className = '', style }) {
  return (
    <span aria-hidden="true" style={style} className={`skeleton block ${className}`} />
  );
}

/** The listing card's silhouette. */
export function CardSkeleton() {
  return (
    <article className="border border-rule-soft bg-paper-2/40">
      <Skeleton className="h-40 w-full" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </article>
  );
}

export function CardSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export default Skeleton;
