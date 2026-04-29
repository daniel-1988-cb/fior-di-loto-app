"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  /** Valori da plottare. Per uno sparkline mensile passa 12 numeri. */
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Mostra il punto del massimo. */
  highlightPeak?: boolean;
}

/**
 * Sparkline SVG minimo. Rende la curva relativa (max=top, 0=bottom),
 * area riempita semi-trasparente sotto la linea, opzionale punto sul peak.
 *
 * Usa `currentColor` per ereditare il colore dal parent — vesti il
 * componente con classi tipo `text-primary` o `text-amber-600`.
 */
export function Sparkline({
  values,
  width = 64,
  height = 18,
  className,
  highlightPeak = false,
}: SparklineProps) {
  if (!values || values.length === 0) {
    return (
      <div
        className={cn("inline-block", className)}
        style={{ width, height }}
        aria-hidden
      />
    );
  }
  const max = Math.max(...values, 0.01);
  const total = values.reduce((s, v) => s + v, 0);
  // Se nessuna vendita, rendi solo una linea piatta grigia
  if (total === 0 || max === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("block text-muted-foreground/30", className)}
        aria-hidden
      >
        <line
          x1="0"
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  }
  const n = values.length;
  const points: Array<[number, number]> = values.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    // padding 1px in alto per non tagliare il peak
    const y = height - 1 - (v / max) * (height - 2);
    return [x, y];
  });
  const linePath = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  // Area: linea + chiusura in basso
  const areaPath = `0,${height} ${linePath} ${width},${height}`;
  // Peak
  const peakIdx = values.indexOf(max);
  const peakXY = points[peakIdx];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block", className)}
      aria-hidden
    >
      <polygon points={areaPath} fill="currentColor" fillOpacity={0.18} />
      <polyline
        points={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {highlightPeak && peakXY && (
        <circle cx={peakXY[0]} cy={peakXY[1]} r="1.6" fill="currentColor" />
      )}
    </svg>
  );
}
