"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// ============================================
// RevenueChart — wrapper Recharts riusabile.
//
// Props:
//  - data: array generico con una chiave `label` e N serie numeriche
//  - series: descrizione delle serie (dataKey + label + colore token-aware)
//  - title opzionale
//  - variant: "line" | "bar"
//
// I colori sono passati via `stroke` / `fill` con valori HSL fissi che
// però rimangono gradevoli in dark mode (saturazione/luminanza medie).
// Per assi/grid usiamo `currentColor` + utility class → Tailwind token.
// ============================================

export type ChartSeries = {
  dataKey: string;
  label: string;
  color: string; // hex or css color
};

export type ChartPoint = {
  label: string;
  [k: string]: string | number;
};

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

function FmtTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  unit?: "eur" | "count";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}:{" "}
          {unit === "eur"
            ? `€ ${Number(p.value).toFixed(0)}`
            : Number(p.value).toLocaleString("it-IT")}
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({
  data,
  series,
  title,
  variant = "line",
  unit = "eur",
  height = 260,
}: {
  data: ChartPoint[];
  series: ChartSeries[];
  title?: string;
  variant?: "line" | "bar";
  unit?: "eur" | "count";
  height?: number;
}) {
  const Chart = variant === "bar" ? BarChart : LineChart;

  return (
    <div className="w-full">
      {title && <h3 className="mb-2 text-sm font-semibold">{title}</h3>}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer>
          <Chart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-border"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            <Tooltip content={<FmtTooltip unit={unit} />} />
            {series.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconSize={10}
              />
            )}
            {variant === "bar"
              ? series.map((s) => (
                  <Bar
                    key={s.dataKey}
                    dataKey={s.dataKey}
                    name={s.label}
                    fill={s.color}
                    radius={[6, 6, 0, 0]}
                  />
                ))
              : series.map((s) => (
                  <Line
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2.5}
                    dot={{ fill: s.color, r: 3 }}
                  />
                ))}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Preset colori coerenti con brand + accessibili in dark mode. */
export const CHART_COLORS = {
  primary: "#6B4EFF",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  rose: "#E8A4A4", // brand Fior di Loto
} as const;
