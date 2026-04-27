import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui";

export function KpiCard({
  icon,
  label,
  value,
  subtitle,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  delta?: number;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const deltaPositive = (delta ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        {hasDelta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              deltaPositive
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {deltaPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}
