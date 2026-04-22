"use client";
import React from "react";

export type BarDatum = {
  label: string;
  value: number;
  sub?: string;
  emphasize?: boolean;
};

export default function BarChart({
  data, min, max, xLabel, height = 260, annotateFmt,
  zeroLine = false,
}: {
  data: BarDatum[];
  min?: number;
  max?: number;
  xLabel?: string;
  height?: number;
  annotateFmt?: (v: number) => string;
  zeroLine?: boolean;
}) {
  const values = data.map(d => d.value);
  const lo = min ?? Math.min(0, ...values);
  const hi = max ?? Math.max(...values, 0);
  const W = 560;
  const H = height;
  const PAD_L = 170, PAD_R = 50, PAD_T = 8, PAD_B = 28;
  const IW = W - PAD_L - PAD_R, IH = H - PAD_T - PAD_B;
  const barH = Math.min(28, (IH / data.length) * 0.75);
  const rowH = IH / data.length;

  const sx = (v: number) => PAD_L + ((v - lo) / (hi - lo || 1)) * IW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* x axis */}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#111" strokeWidth={0.6} />
      {zeroLine && lo < 0 && hi > 0 && (
        <line x1={sx(0)} y1={PAD_T} x2={sx(0)} y2={H - PAD_B} stroke="#111" strokeWidth={0.8} />
      )}
      {data.map((d, i) => {
        const y = PAD_T + i * rowH + (rowH - barH) / 2;
        const x0 = sx(Math.max(lo, 0));
        const xv = sx(d.value);
        const negative = d.value < 0;
        const color = d.emphasize ? "#b02a2a" : negative ? "#b02a2a" : "#111111";
        // Always anchor value to the RIGHT of the bar so it can never overlap
        // the left-side category label.
        const annotateX = (negative ? x0 : xv) + 4;
        return (
          <g key={d.label}>
            <text x={PAD_L - 8} y={y + barH / 2 + 4} fontSize={11} textAnchor="end" fill="#222">
              {d.label}
            </text>
            <rect
              x={Math.min(x0, xv)} y={y}
              width={Math.abs(xv - x0)} height={barH}
              fill={color}
            />
            <text
              x={annotateX} y={y + barH / 2 + 4} fontSize={10}
              textAnchor="start" fill="#222"
            >
              {annotateFmt ? annotateFmt(d.value) : d.value.toFixed(3)}
              {d.sub && <tspan fill="#888"> · {d.sub}</tspan>}
            </text>
          </g>
        );
      })}
      {xLabel && (
        <text x={PAD_L + IW / 2} y={H - 6} fontSize={11} textAnchor="middle" fill="#333">
          {xLabel}
        </text>
      )}
    </svg>
  );
}
