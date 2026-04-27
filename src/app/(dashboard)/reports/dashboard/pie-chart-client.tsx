"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/components/reports/revenue-chart";
import { formatCurrency } from "@/lib/utils";

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.gold,
  CHART_COLORS.rose_dark,
  CHART_COLORS.gold_light,
  CHART_COLORS.brown_light,
  CHART_COLORS.gold_dark,
];

export function PagamentiPieChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            paddingAngle={2}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | string | readonly (string | number)[] | undefined) =>
              formatCurrency(Number(value == null ? 0 : Array.isArray(value) ? value[0] : value))
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
