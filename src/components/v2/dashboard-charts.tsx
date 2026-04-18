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
} from "recharts";
import type { DayData } from "@/lib/actions/dashboard";

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {unit === "eur" ? `€ ${p.value.toFixed(0)}` : p.value}
        </p>
      ))}
    </div>
  );
}

export function SalesLineChart({ data }: { data: DayData[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="currentColor" strokeDasharray="3 3" className="text-border" />
          <XAxis
            dataKey="giorno"
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <Tooltip content={<ChartTooltip unit="eur" />} />
          <Line
            type="monotone"
            dataKey="vendite"
            name="Vendite"
            stroke="#6B4EFF"
            strokeWidth={2.5}
            dot={{ fill: "#6B4EFF", r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="appuntamenti"
            name="Appuntamenti"
            stroke="#22C55E"
            strokeWidth={2.5}
            dot={{ fill: "#22C55E", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AppointmentsBarChart({ data }: { data: DayData[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="currentColor" strokeDasharray="3 3" className="text-border" />
          <XAxis
            dataKey="giorno"
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="appuntamenti" name="Appuntamenti" fill="#6B4EFF" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
