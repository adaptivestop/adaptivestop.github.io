"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Core } from "@/lib/types";
import StatCard from "@/components/StatCard";

export default function Home() {
  const [core, setCore] = useState<Core | null>(null);
  useEffect(() => { fetch("/data/core.json").then(r => r.json()).then(setCore); }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-12">
      {/* Hero */}
      <section className="space-y-3">
        <div className="text-[11px] uppercase tracking-widest text-neutral-500">NeurIPS submission · v10</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
          Learning to Stop: Process-Signal Early Exit for Diffusion Models
        </h1>
        <div className="text-sm text-neutral-600">
          Oli Gurmessa &nbsp;·&nbsp; Dr.&nbsp;Pakeeza Akram
        </div>
        <p className="max-w-3xl text-[15px] text-neutral-800 pt-3 leading-relaxed">
          Text-to-image diffusion models run a fixed step budget per sample even though
          individual prompts converge at very different rates. <b>AdaptiveStop</b> reads
          ten scalar signals from the U-Net's existing per-step outputs and decides
          <i> per image </i> when to stop denoising. On 2,419 prompts pooled from
          PartiPrompts, MS-COCO, and DrawBench, the classifier meets both primary
          pre-registered targets: ROC-AUC 0.933 and 32.6% compute savings.
        </p>
      </section>

      {/* Headline stats */}
      {core && (
        <section>
          <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">Headline (τ=0.80, 5-fold OOF)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="ROC-AUC"
              value={core.headline.roc_auc.toFixed(3)}
              ci={core.headline.roc_auc_ci95 ?? undefined}
              accent
            />
            <StatCard
              label="F₁(STOP)"
              value={core.headline.f1_stop.toFixed(3)}
              ci={core.headline.f1_stop_ci95 ?? undefined}
            />
            <StatCard
              label="Compute savings"
              value={`${core.headline.savings_pct.toFixed(1)}%`}
              sub={`mean stop step ${core.headline.avg_stop.toFixed(1)} / 30`}
            />
            <StatCard
              label="Mean q-loss"
              value={core.headline.mean_qloss.toFixed(2)}
              sub={`p90 = ${core.headline.p90_qloss.toFixed(2)}, p95 = ${core.headline.p95_qloss.toFixed(2)}`}
            />
          </div>
        </section>
      )}

      {/* Section tiles */}
      <section className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500">Research hub</div>
        <div className="grid md:grid-cols-3 gap-3">
          <Tile href="/sim" title="Simulator"
            desc="Browse 500 prompts across three schedulers. Per-step decoded images, signals, and the classifier's per-checkpoint STOP/CONTINUE decision." />
          <Tile href="/ablations" title="Ablations"
            desc="Threshold sensitivity, leave-one-group-out, and standardised LR coefficients on the pooled 2,419-prompt corpus." />
          <Tile href="/results" title="Results"
            desc="Pre-registered success criteria, v9-cohort replication, per-corpus external validity, cross-scheduler transfer." />
          <Tile href="/paper" title="Paper"
            desc="PDF of the manuscript and gallery of the 11 figures." />
          <Tile href="/about" title="About"
            desc="Authors, citation, and source links." />
        </div>
      </section>

      {/* Mechanistic callout */}
      {core && (
        <section className="bg-white border border-neutral-300 p-5 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Mechanistic finding</div>
          <div className="text-[15px] leading-relaxed text-neutral-900">
            A leave-one-group-out analysis attributes essentially all of the lift over a
            step-position baseline to a single signal group: the
            classifier-free-guidance gap. Removing the CFG-gap pair drops AUC by 0.025;
            removing any other group changes AUC by at most 0.001. AdaptiveStop is, functionally,
            a two-feature <i>CFG-gap probe</i>.
          </div>
          <div className="text-[11px] text-neutral-500">
            Cross-scheduler zero-shot: ΔAUC on DDIM = {core.cross_scheduler_summary.delta_auc_ddim.toFixed(4)},
            on DPM-Solver++ = {core.cross_scheduler_summary.delta_auc_dpm.toFixed(4)}.
          </div>
        </section>
      )}
    </main>
  );
}

function Tile({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="bg-white border border-neutral-300 hover:border-neutral-900 transition p-4 block"
    >
      <div className="text-lg font-bold">{title} <span className="text-neutral-400">→</span></div>
      <div className="text-[13px] text-neutral-600 mt-1 leading-relaxed">{desc}</div>
    </Link>
  );
}
