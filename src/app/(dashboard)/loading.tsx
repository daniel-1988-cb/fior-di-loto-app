import { CardSkeleton, TableSkeleton } from "@/components/v2/skeleton";

export default function V2Loading() {
  return (
    <>
      <div className="mb-6 space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted/60" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted/60" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="mt-6">
        <TableSkeleton rows={4} cols={4} />
      </div>
    </>
  );
}
