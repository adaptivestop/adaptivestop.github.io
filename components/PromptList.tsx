"use client";
import React from "react";
import type { Prompt } from "@/lib/types";

function stopBadgeColor(stop: number | undefined, ref: number = 30): string {
  if (stop === undefined || stop === ref) return "bg-neutral-300 text-neutral-700";  // never/ref
  if (stop <= ref * 0.55)                return "bg-[#b02a2a] text-white";            // early
  if (stop <= ref * 0.85)                return "bg-neutral-600 text-white";          // mid
  return "bg-neutral-400 text-white";                                                  // late
}

export default function PromptList({
  prompts, selectedId, onSelect,
}: {
  prompts: Prompt[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-neutral-300 max-h-[75vh] overflow-y-auto">
      {prompts.length === 0 && (
        <div className="p-3 text-[13px] text-neutral-500">No prompts match your filters.</div>
      )}
      {prompts.map(p => {
        const stop = p.euler?.stop_step;
        const isSelected = p.id === selectedId;
        const multi = !!(p.dpm && p.ddim);
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={
              "w-full text-left border-b border-neutral-200 px-3 py-2 " +
              "transition " +
              (isSelected
                ? "bg-neutral-900 text-neutral-50 hover:bg-neutral-900"
                : "hover:bg-neutral-100")
            }
          >
            <div className="flex items-baseline gap-2">
              <span
                className={
                  "inline-flex items-center justify-center min-w-[26px] h-[20px] " +
                  "text-[10px] font-bold tabular-nums px-1 " +
                  (isSelected
                    ? "bg-white text-neutral-900"
                    : stopBadgeColor(stop))
                }
                title={stop === undefined ? "no Euler trajectory" : `stops at step ${stop}/30`}
              >
                {stop ?? "—"}
              </span>
              <span className={"text-[13px] truncate flex-1 " + (isSelected ? "" : "text-neutral-900")}>
                {p.text || p.id}
              </span>
              {multi && (
                <span
                  className={
                    "text-[9px] px-1 py-0.5 tabular-nums border " +
                    (isSelected
                      ? "border-neutral-300 text-neutral-200"
                      : "border-neutral-400 text-neutral-500")
                  }
                  title="has DPM++ and DDIM panels"
                >
                  ×3
                </span>
              )}
            </div>
            <div className={"text-[10px] mt-0.5 " + (isSelected ? "text-neutral-300" : "text-neutral-500")}>
              {p.id} · {p.corpus}
            </div>
          </button>
        );
      })}
    </div>
  );
}
