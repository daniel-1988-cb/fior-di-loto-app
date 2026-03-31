export default function ClientiLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-9 w-32 rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-muted" />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-4 h-11 w-full rounded-lg bg-muted" />

      {/* Filter pills skeleton */}
      <div className="mb-4 flex gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-7 w-16 rounded-full bg-muted" />
        ))}
      </div>

      {/* Segment summary bar skeleton */}
      <div className="mb-4 flex gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 w-20 rounded-full bg-muted" />
        ))}
      </div>

      {/* Client list skeleton */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            {/* Avatar */}
            <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
            {/* Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
              <div className="flex gap-3">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
            </div>
            {/* Stats */}
            <div className="hidden shrink-0 space-y-1 sm:block">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
