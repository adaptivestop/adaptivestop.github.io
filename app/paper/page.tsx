"use client";
import { useState } from "react";

const FIGS = [
  { file: "fig1_pareto.pdf",              caption: "Fig 1 — Savings vs quality-loss Pareto frontier." },
  { file: "fig2_progress_by_step.pdf",    caption: "Fig 2 — Progress distribution by step." },
  { file: "fig3_roc_curves.pdf",          caption: "Fig 3 — ROC curves with bootstrap CI." },
  { file: "fig4_confusion_matrix.pdf",    caption: "Fig 4 — Confusion matrix at τ=0.80." },
  { file: "fig5_by_corpus.pdf",           caption: "Fig 5 — Per-corpus AUC and F₁." },
  { file: "fig6_group_loo.pdf",           caption: "Fig 6 — Leave-one-group-out ΔAUC." },
  { file: "fig7_coefficients.pdf",        caption: "Fig 7 — Standardised LR coefficients." },
  { file: "fig8_tau_sensitivity.pdf",     caption: "Fig 8 — Threshold sensitivity." },
  { file: "fig9_qloss_distribution.pdf",  caption: "Fig 9 — Per-prompt q-loss distribution at τ=0.80." },
  { file: "fig10_cfg_gap_trajectories.pdf", caption: "Fig 10 — CFG-gap trajectories, early-stop vs late-stop cohorts." },
  { file: "fig11_cross_scheduler.pdf",    caption: "Fig 11 — Cross-scheduler transfer: AUC / F₁ / savings." },
];

export default function PaperPage() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Paper</h1>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          The manuscript and all 11 figures referenced in it.
        </p>
      </header>

      <section className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/paper/main.pdf"
            className="inline-block border border-neutral-900 bg-neutral-900 text-neutral-50 px-3 py-1.5 text-sm hover:bg-neutral-800">
            ↓ download PDF
          </a>
          <a
            href="/paper/main.pdf"
            target="_blank" rel="noreferrer"
            className="inline-block border border-neutral-400 px-3 py-1.5 text-sm hover:bg-neutral-100">
            open in new tab
          </a>
          <span className="text-[11px] text-neutral-500">
            17 pages · Gurmessa &amp; Akram · v10 evaluation
          </span>
        </div>
        <div className="bg-white border border-neutral-300 p-2">
          <object data="/paper/main.pdf" type="application/pdf" className="w-full" style={{ height: 800 }}>
            <p className="p-4 text-sm text-neutral-600">
              Your browser can't inline-render the PDF. Use the download link above.
            </p>
          </object>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Figures</h2>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Click a thumbnail to open its PDF full-size.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FIGS.map(f => (
            <a
              key={f.file}
              href={`/figures/${f.file}`}
              target="_blank" rel="noreferrer"
              className="bg-white border border-neutral-300 hover:border-neutral-900 transition p-2 block"
            >
              <object
                data={`/figures/${f.file}`}
                type="application/pdf"
                className="w-full bg-neutral-50 pointer-events-none"
                style={{ height: 180 }}
              >
                <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                  {f.file}
                </div>
              </object>
              <div className="text-[11px] text-neutral-700 mt-2 leading-snug">{f.caption}</div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
