export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-9 w-48 rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-64 rounded bg-muted" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-7 w-16 rounded bg-muted" />
              </div>
              <div className="h-11 w-11 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions skeleton */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 rounded bg-muted" />
              <div className="h-8 w-16 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar skeleton */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-3 rounded-full bg-muted" />
        <div className="mt-2 h-3 w-40 rounded bg-muted" />
      </div>
    </div>
  );
}
