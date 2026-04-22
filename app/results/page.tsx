"use client";
import { useEffect, useState } from "react";
import type { Core, Transfer } from "@/lib/types";
import StatCard from "@/components/StatCard";

export default function ResultsPage() {
  const [core, setCore]         = useState<Core | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  useEffect(() => {
    fetch("/data/core.json").then(r => r.json()).then(setCore);
    fetch("/data/transfer.json").then(r => r.json()).then(setTransfer);
  }, []);

  if (!core || !transfer) return <main className="p-8 text-neutral-600">loading…</main>;

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Results</h1>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Pre-registered primary criteria, v9-cohort replication, and cross-scheduler
          transfer with per-scheduler threshold calibration.
        </p>
      </header>

      {/* Headline */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Headline (τ=0.80, 5-fold OOF)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="ROC-AUC"       value={core.headline.roc_auc.toFixed(3)}   ci={core.headline.roc_auc_ci95 ?? undefined} accent />
          <StatCard label="F₁(STOP)"      value={core.headline.f1_stop.toFixed(3)}   ci={core.headline.f1_stop_ci95 ?? undefined} />
          <StatCard label="Savings"       value={`${core.headline.savings_pct.toFixed(1)}%`} sub={`stop step avg ${core.headline.avg_stop.toFixed(1)}/30`} />
          <StatCard label="Mean q-loss"   value={core.headline.mean_qloss.toFixed(2)} sub={`p90 ${core.headline.p90_qloss.toFixed(2)} · p95 ${core.headline.p95_qloss.toFixed(2)}`} />
        </div>
      </section>

      {/* Pre-registered criteria */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Pre-registered primary criteria</h2>
        <div className="bg-white border border-neutral-300">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-300 text-[11px] uppercase tracking-wider text-neutral-500">
              <tr><Th>Criterion</Th><Th>Target</Th><Th>Measured</Th><Th>Outcome</Th></tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {Object.entries(core.criteria).map(([k, v]) => (
                <tr key={k} className="border-b border-neutral-200">
                  <Td className="font-sans">{k.replace(/_/g, " ")}</Td>
                  <Td>{v.target}</Td>
                  <Td>{typeof v.measured === "number" ? v.measured.toFixed(4) : "—"}</Td>
                  <Td>
                    {v.pass
                      ? <span className="text-[#2f6e39] font-bold">✓ met</span>
                      : <span className="text-[#b02a2a] font-bold">✗</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-neutral-600">
          Overall: {core.all_primary_pass
            ? <span className="text-[#2f6e39] font-bold">all primary criteria met</span>
            : <span className="text-neutral-700">mixed outcome — see paper §6.5 for full accounting. The F₁ point estimate falls 0.004 below target; the 0.80 target lies inside the 95% bootstrap CI.</span>}
        </p>
      </section>

      {/* v9-cohort replication */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold">v9-cohort replication</h2>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Pooled 2,419-prompt classifier evaluated on the 964-prompt v9 subset at τ=0.90.
          A delta within ±0.02 of the v9 standalone AUC 0.913 is the "scaling did not
          dilute the signal" gate.
        </p>
        <div className="bg-white border border-neutral-300 p-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">v9 reference</div>
            <div className="mt-1 font-mono tabular-nums">
              AUC {core.v9_replication.v9_reference_tau09.roc_auc.toFixed(3)}<br/>
              F₁ {core.v9_replication.v9_reference_tau09.f1_stop.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">v10 pooled (v9 slice)</div>
            <div className="mt-1 font-mono tabular-nums">
              AUC {core.v9_replication.v10_measured_tau09.roc_auc.toFixed(3)}<br/>
              F₁ {core.v9_replication.v10_measured_tau09.f1_stop.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">Delta</div>
            <div className="mt-1 font-mono tabular-nums">
              ΔAUC {(core.v9_replication.v10_measured_tau09.roc_auc - core.v9_replication.v9_reference_tau09.roc_auc).toFixed(4)}<br/>
              ΔF₁  {(core.v9_replication.v10_measured_tau09.f1_stop - core.v9_replication.v9_reference_tau09.f1_stop).toFixed(4)}
            </div>
          </div>
        </div>
      </section>

      {/* Cross-scheduler transfer */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Cross-scheduler transfer</h2>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Signals-transfer (AUC) is threshold-invariant. Policy transfer (F₁, savings,
          q-loss) is threshold-dependent; we calibrate a single scalar t<sup>★</sup> per
          target on a held-out 100-prompt set.
        </p>
        <div className="bg-white border border-neutral-300 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-300 text-[11px] uppercase tracking-wider text-neutral-500">
              <tr>
                <Th>Scheduler</Th><Th>ref</Th><Th>t★</Th><Th>AUC</Th>
                <Th>F₁ uncal</Th><Th>F₁ cal</Th>
                <Th>Sav uncal</Th><Th>Sav cal</Th>
                <Th>q̄ uncal</Th><Th>q̄ cal</Th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              <TransferRow name="Euler (ref)" row={transfer.euler} isRef />
              <TransferRow name="DPM-Solver++" row={transfer.dpm} />
              <TransferRow name="DDIM" row={transfer.ddim} />
            </tbody>
          </table>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-4 text-[12px]">
          <div className="bg-white border border-neutral-300 p-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">AUC gates</div>
            {Object.entries(transfer.gates.auc).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-neutral-100 py-1">
                <span>{k}</span>
                <span className="font-mono tabular-nums">
                  Δ {v.delta > 0 ? "+" : ""}{v.delta.toFixed(4)} &nbsp;
                  {v.pass
                    ? <span className="text-[#2f6e39] font-bold">✓</span>
                    : <span className="text-[#b02a2a] font-bold">✗</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-white border border-neutral-300 p-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">Policy gates (post-calibration)</div>
            {Object.entries(transfer.gates.policy).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-neutral-100 py-1">
                <span>{k}</span>
                <span className="font-mono tabular-nums">
                  {v.pass
                    ? <span className="text-[#2f6e39] font-bold">✓</span>
                    : <span className="text-[#b02a2a] font-bold">✗</span>}
                  {v.ratio !== undefined && <span className="text-neutral-500"> &nbsp;ratio {v.ratio.toFixed(2)}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function TransferRow({ name, row, isRef = false }:
  { name: string; row: Transfer["euler"]; isRef?: boolean }) {
  return (
    <tr className="border-b border-neutral-200">
      <Td className="font-sans">{name}</Td>
      <Td>{row.ref_step}</Td>
      <Td>{row.t_star.toFixed(2)}</Td>
      <Td className="font-bold">{row.uncalibrated.roc_auc.toFixed(3)}</Td>
      <Td>{row.uncalibrated.f1_stop.toFixed(3)}</Td>
      <Td>{isRef ? "—" : row.calibrated.f1_stop.toFixed(3)}</Td>
      <Td>{row.uncalibrated.savings_pct.toFixed(1)}</Td>
      <Td>{isRef ? "—" : row.calibrated.savings_pct.toFixed(1)}</Td>
      <Td>{row.uncalibrated.mean_qloss.toFixed(2)}</Td>
      <Td>{isRef ? "—" : row.calibrated.mean_qloss.toFixed(2)}</Td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-normal">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-3 py-1.5 " + (className || "")}>{children}</td>;
}
