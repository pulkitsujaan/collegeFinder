/** Shown while a lazily-loaded route chunk is fetching. */
export default function RouteFallback() {
  return (
    <div className="shell py-24" role="status" aria-label="Loading page">
      <div className="skeleton h-3 w-24 rounded-card" />
      <div className="skeleton mt-6 h-16 w-3/4 rounded-card md:h-24" />
      <div className="skeleton mt-4 h-4 w-1/2 rounded-card" />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="skeleton h-64 rounded-card" />
        ))}
      </div>
    </div>
  );
}
