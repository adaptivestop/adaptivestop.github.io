"use client";
import React from "react";
import type { SchedulerTrajectory, SchedulerKey } from "@/lib/types";

/** Display one scheduler's trajectory for one prompt: per-step image tiles +
    decision timeline + compact stop summary. */
export default function SchedulerPanel({
  name, trajectory, keyName, highlightCalibrated = true,
}: {
  name: string;
  trajectory: SchedulerTrajectory;
  keyName: SchedulerKey;
  highlightCalibrated?: boolean;
}) {
  const steps = Object.keys(trajectory.images).map(Number).sort((a, b) => a - b);
  const stop = trajectory.stop_step;
  const refStep = trajectory.ref_step;

  return (
    <div className="bg-white border border-neutral-300 p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <span className="font-bold text-sm">{name}</span>
          <span className="text-[11px] text-neutral-500 ml-2">
            {refStep} steps · t<sup>&#x2605;</sup> = {trajectory.t_star.toFixed(2)}
          </span>
        </div>
        <div className="text-[11px] tabular-nums text-neutral-700">
          stop at <span className="font-bold">{stop}</span>
          {" · "}savings <span className="font-bold">{trajectory.savings_pct.toFixed(1)}%</span>
          {" · "}q-loss <span className="font-bold">{trajectory.quality_loss.toFixed(3)}</span>
        </div>
      </div>

      {/* Image strip */}
      <div className="grid grid-cols-6 gap-1">
        {steps.map(s => {
          const decision = trajectory.pred[s];
          const url = trajectory.images[s];
          const isStop = s === stop;
          const isRef  = s === refStep;
          const reached = s <= stop || isRef;
          return (
            <div key={s} className="relative">
              <img
                src={url} alt={`${keyName} step ${s}`}
                loading="lazy" decoding="async"
                className={
                  "w-full aspect-square border object-cover " +
                  (isStop ? "border-[#b02a2a] ring-2 ring-[#b02a2a]" :
                   isRef  ? "border-neutral-700" :
                   reached ? "border-neutral-400" : "border-neutral-300 opacity-60")
                }
              />
              <div className="absolute top-0 left-0 bg-black/70 text-white text-[9px] px-1 tabular-nums">
                {s}
              </div>
              {isStop && (
                <div className="absolute bottom-0 right-0 bg-[#b02a2a] text-white text-[9px] px-1 font-bold">
                  STOP
                </div>
              )}
              {isRef && !isStop && (
                <div className="absolute bottom-0 right-0 bg-neutral-700 text-white text-[9px] px-1">
                  ref
                </div>
              )}
              {decision === "continue" && s < stop && (
                <div className="absolute bottom-0 right-0 bg-white text-neutral-600 text-[9px] px-1 border border-neutral-300">
                  cont.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Decision probabilities strip */}
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 pt-1">
        P(continue) per step
      </div>
      <div className="grid grid-cols-6 gap-1">
        {steps.map(s => {
          const p = trajectory.prob_continue[s];
          const pBar = p == null ? 0 : p;
          return (
            <div key={s} className="flex flex-col items-center">
              <div className="w-full h-10 bg-neutral-100 relative border border-neutral-200">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-neutral-700"
                  style={{ height: `${pBar * 100}%` }}
                />
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-[#b02a2a]"
                  style={{ bottom: `${trajectory.t_star * 100}%` }}
                />
              </div>
              <div className="text-[9px] tabular-nums text-neutral-600 mt-0.5">
                {p == null ? "—" : p.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {highlightCalibrated && trajectory.stop_step_uncal !== undefined &&
        trajectory.stop_step_uncal !== trajectory.stop_step && (
        <div className="text-[11px] text-neutral-600 pt-1 border-t border-neutral-200">
          Without calibration (<span className="italic">t=0.5</span>):
          {" "}stops at <span className="font-bold">{trajectory.stop_step_uncal}</span>,
          savings <span className="font-bold">{trajectory.savings_uncal_pct?.toFixed(1)}%</span>,
          q-loss <span className="font-bold">{trajectory.quality_loss_uncal?.toFixed(3)}</span>.
        </div>
      )}
    </div>
  );
}
