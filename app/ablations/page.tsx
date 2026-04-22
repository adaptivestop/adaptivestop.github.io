"use client";
import { useEffect, useMemo, useState } from "react";
import type { Ablations } from "@/lib/types";
import BarChart from "@/components/BarChart";

export default function AblationsPage() {
  const [abl, setAbl] = useState<Ablations | null>(null);
  const [tauIdx, setTauIdx] = useState(0);   // selected row of tau_sweep
  useEffect(() => { fetch("/data/ablations.json").then(r => r.json()).then(setAbl); }, []);

  // IMPORTANT: all hooks (including useMemo) must run unconditionally on every
  // render, so we compute these *before* the loading-state early return.
  const looData = useMemo(() => {
    if (!abl) return [];
    return abl.group_loo
       .filter(r => r.removed !== "NONE (all 10)")
       .sort((a, b) => a.delta_auc - b.delta_auc)
       .map(r => ({ label: r.removed, value: r.delta_auc, emphasize: r.delta_auc <= -0.01 }));
  }, [abl]);

  const coefData = useMemo(() => {
    if (!abl) return [];
    return [...abl.coefficients]
      .sort((a, b) => a.coef - b.coef)
      .map(c => ({ label: c.signal, value: c.coef }));
  }, [abl]);

  if (!abl) return <main className="p-8 text-neutral-600">loading…</main>;
  const tauRow = abl.tau_sweep[tauIdx];

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Ablations</h1>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Interactive summary of the paper's ablation results on the pooled 2,419-prompt
          corpus. All numbers are 5-fold prompt-grouped OOF aggregates.
        </p>
      </header>

      {/* Threshold sensitivity */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Threshold sensitivity</h2>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Slide through the four pre-registered τ values. Lowering τ labels more checkpoints
          as <b>stop</b>; AUC degrades smoothly, F<sub>1</sub> is more sensitive, and the
          savings–quality trade-off is visible directly.
        </p>
        <input
          type="range" min={0} max={abl.tau_sweep.length - 1} step={1}
          value={tauIdx} onChange={e => setTauIdx(Number(e.target.value))}
          className="w-full max-w-md accent-neutral-900"
        />
        <div className="flex gap-2 text-[11px] font-mono">
          {abl.tau_sweep.map((r, i) => (
            <button
              key={r.tau}
              onClick={() => setTauIdx(i)}
              className={
                "border px-2 py-1 " +
                (i === tauIdx ? "border-neutral-900 bg-neutral-900 text-neutral-50"
                              : "border-neutral-400 hover:bg-neutral-100")
              }
            >τ = {r.tau.toFixed(2)}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <Metric label="ROC-AUC"       value={tauRow.roc_auc.toFixed(4)} />
          <Metric label="F₁(STOP)"      value={tauRow.f1_stop.toFixed(4)} />
          <Metric label="Savings (%)"   value={tauRow.savings_pct.toFixed(1)} />
          <Metric label="Mean q-loss"   value={tauRow.mean_qloss.toFixed(3)} />
          <Metric label="p50 q-loss"    value={tauRow.med_qloss.toFixed(3)} />
          <Metric label="p90 q-loss"    value={tauRow.p90_qloss.toFixed(3)} />
          <Metric label="p95 q-loss"    value={tauRow.p95_qloss.toFixed(3)} />
          <Metric label="STOP prevalence (%)"  value={tauRow.stop_overall_pct.toFixed(1)} />
        </div>
      </section>

      {/* Group LOO */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Signal-group leave-one-out</h2>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Δ ROC-AUC when each two-signal group is removed, measured at τ=0.80 on the
          pooled 2,419-prompt corpus. Removing the CFG-gap pair costs 0.025 AUC;
          every other group is within ±0.001.
        </p>
        <div className="bg-white border border-neutral-300 p-3">
          <BarChart
            data={looData} zeroLine
            annotateFmt={v => (v >= 0 ? "+" : "") + v.toFixed(4)}
            xLabel="Δ ROC-AUC  (group removed − all 10 signals)"
            height={200}
          />
        </div>
      </section>

      {/* LR coefficients */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Standardised logistic-regression coefficients</h2>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Negative values push the decision toward <b>stop</b>; positive values push toward
          <b> continue</b>. The two CFG-gap features dominate by a factor of 2–3 over every
          other signal.
        </p>
        <div className="bg-white border border-neutral-300 p-3">
          <BarChart
            data={coefData} zeroLine
            annotateFmt={v => (v >= 0 ? "+" : "") + v.toFixed(2)}
            xLabel="standardised coefficient"
            height={320}
          />
        </div>
      </section>

      {/* Per-corpus */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Per-corpus breakdown</h2>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Pooled classifier evaluated separately on each corpus slice. AUC holds within a
          ±0.02 band across the three corpora at both τ values.
        </p>
        <div className="bg-white border border-neutral-300 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-300 text-[11px] uppercase tracking-wider text-neutral-500">
              <tr><Th>τ</Th><Th>Corpus</Th><Th>n</Th><Th>STOP %</Th><Th>Bal.Acc</Th><Th>F₁(STOP)</Th><Th>ROC-AUC</Th></tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {abl.by_corpus.map((r, i) => (
                <tr key={i} className="border-b border-neutral-200">
                  <Td>{r.tau}</Td>
                  <Td>{r.corpus}</Td>
                  <Td className="text-right">{r.n_prompts}</Td>
                  <Td className="text-right">{r.stop_pct.toFixed(1)}</Td>
                  <Td className="text-right">{r.bal_acc.toFixed(3)}</Td>
                  <Td className="text-right">{r.f1_stop.toFixed(3)}</Td>
                  <Td className="text-right font-bold">{r.roc_auc.toFixed(3)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-neutral-300 p-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-normal">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-3 py-1.5 " + (className || "")}>{children}</td>;
}
