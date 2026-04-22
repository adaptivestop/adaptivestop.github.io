import React from "react";

export default function StatCard({
  label, value, sub, ci, accent, children,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  ci?: [number, number];
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={
        "bg-white border p-4 " +
        (accent ? "border-neutral-900" : "border-neutral-300")
      }
    >
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
      {ci && (
        <div className="text-[11px] text-neutral-500 tabular-nums">
          95% CI [{ci[0].toFixed(3)}, {ci[1].toFixed(3)}]
        </div>
      )}
      {sub && <div className="text-[11px] text-neutral-500 mt-1">{sub}</div>}
      {children}
    </div>
  );
}
