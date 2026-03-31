export default function AgendaLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-9 w-32 rounded-lg bg-muted" />
        <div className="h-10 w-36 rounded-lg bg-muted" />
      </div>

      {/* Week nav skeleton */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="h-9 w-9 rounded-lg bg-muted" />
      </div>

      {/* Day tabs skeleton */}
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-16 w-12 shrink-0 rounded-lg bg-muted" />
        ))}
      </div>

      {/* Time grid skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex border-b border-border last:border-0">
            <div className="w-14 shrink-0 border-r border-border p-3">
              <div className="h-3 w-10 rounded bg-muted" />
            </div>
            <div className="flex-1 p-2">
              {i % 3 === 0 && (
                <div className="h-12 w-full rounded-lg bg-muted" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
