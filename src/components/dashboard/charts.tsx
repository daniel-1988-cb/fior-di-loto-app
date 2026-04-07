"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DayData } from "@/lib/actions/dashboard";

function EuroTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-brown mb-1">{label}</p>
      <p className="text-rose">€ {Number(payload[0]?.value || 0).toFixed(0)}</p>
    </div>
  );
}

function AptTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-brown mb-1">{label}</p>
      <p className="text-info">{payload[0]?.value} appuntamenti</p>
    </div>
  );
}

export function VenditeChart({ data }: { data: DayData[] }) {
  const totale = data.reduce((s, d) => s + d.vendite, 0);
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">Vendite — ultimi 7 giorni</p>
        <p className="text-2xl font-bold text-brown">€ {totale.toFixed(0)}</p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="venditeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c97d7d" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#c97d7d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
          <XAxis dataKey="giorno" tick={{ fontSize: 11, fill: "#9e8e82" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#9e8e82" }} axisLine={false} tickLine={false} />
          <Tooltip content={<EuroTooltip />} />
          <Area
            type="monotone"
            dataKey="vendite"
            stroke="#c97d7d"
            strokeWidth={2}
            fill="url(#venditeGrad)"
            dot={{ r: 3, fill: "#c97d7d", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#c97d7d" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AppuntamentiChart({ data }: { data: DayData[] }) {
  const totale = data.reduce((s, d) => s + d.appuntamenti, 0);
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">Appuntamenti — ultimi 7 giorni</p>
        <p className="text-2xl font-bold text-brown">{totale}</p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
          <XAxis dataKey="giorno" tick={{ fontSize: 11, fill: "#9e8e82" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#9e8e82" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<AptTooltip />} />
          <Bar dataKey="appuntamenti" fill="#7db5c9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
