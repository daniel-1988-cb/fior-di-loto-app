export default function GestionaleLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-9 w-40 rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-muted" />
      </div>

      {/* Month selector skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-9 w-9 rounded-lg bg-muted" />
      </div>

      {/* Summary cards skeleton */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-7 w-24 rounded bg-muted" />
              </div>
              <div className="h-11 w-11 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Transactions list skeleton */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="h-5 w-36 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="space-y-1">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
              </div>
              <div className="h-5 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
