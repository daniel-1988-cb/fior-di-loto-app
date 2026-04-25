"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input, Label } from "@/components/ui";

/**
 * Client-side YYYY-MM selector. Updates the `month` searchParam and
 * triggers a server re-render via router.push.
 */
export function MonthSelector({
  value,
  paramName = "month",
}: {
  value: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(paramName, next);
    else params.delete(paramName);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <Label htmlFor="ms-month">Mese</Label>
        <Input
          id="ms-month"
          type="month"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
