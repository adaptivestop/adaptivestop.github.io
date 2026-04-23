"use client";
import { useState } from "react";

const BIBTEX = `@misc{gurmessa2026adaptivestop,
  title  = {Learning to Stop: Process-Signal Early Exit for Diffusion Models},
  author = {Gurmessa, Oli and Akram, Pakeeza},
  year   = {2026},
  note   = {v10 evaluation — 2499 prompts across PartiPrompts, MS-COCO, DrawBench.}
}`;

export default function AboutPage() {
  const [copied, setCopied] = useState(false);
  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">About</h1>
      </header>

      <section className="bg-white border border-neutral-300 p-5 space-y-1">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500">Authors</div>
        <div className="text-[15px] leading-relaxed">
          <b>Oli Gurmessa</b> &nbsp;·&nbsp; <b>Dr.&nbsp;Pakeeza Akram</b>
        </div>
        <div className="text-[12px] text-neutral-600">
          Department of Computer &amp; Data Sciences, University of St.&nbsp;Thomas
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">What is AdaptiveStop?</h2>
        <p className="text-[14px] leading-relaxed max-w-3xl text-neutral-800">
          A zero-overhead early-exit policy for text-to-image diffusion. At each of a
          handful of checkpoints in a 30-step SDXL run we read ten scalar summaries of the
          U-Net's own per-step outputs and feed them to a single logistic regression that
          predicts <b>stop</b> or <b>continue</b>. Labels come from PickScore convergence
          and are used only offline; at inference the policy touches no reward model and
          requires no architectural modification or retraining of the diffusion model.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Cite this work</h2>
        <div className="bg-white border border-neutral-300 p-3 font-mono text-[12px] whitespace-pre-wrap break-words">
{BIBTEX}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(BIBTEX);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100"
        >{copied ? "copied ✓" : "copy BibTeX"}</button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Data &amp; artifacts</h2>
        <ul className="text-[14px] leading-relaxed text-neutral-800 list-disc pl-5 space-y-1">
          <li>
            <b>Images</b> (per-checkpoint 256×256 JPEGs, 19,994 total across three schedulers)
            are served from a public Cloudflare R2 bucket; URLs are embedded in the simulator's
            JSON so any prompt can be rendered without hitting any of our servers.
          </li>
          <li>
            <b>Signals CSVs</b> (14,994 rows for pooled Euler; 2,500 each for DPM-Solver++ and DDIM)
            and result JSONs live in the repo under <code>harness_v10/data/</code>.
          </li>
          <li>
            <b>Paper source</b> (<code>main.tex</code>, figures, bibliography) under <code>paper/</code>.
          </li>
          <li>
            <b>Collection harness</b> (mp-queue I/O pipeline, collector wrapper, signal library)
            under <code>harness_v10/</code>.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Methodology, in one paragraph</h2>
        <p className="text-[14px] leading-relaxed max-w-3xl text-neutral-800">
          We collect trajectories on 2,499 prompts drawn from three public corpora:
          PartiPrompts (1,632), MS-COCO (667), and DrawBench (200). At six checkpoints of
          each 30-step SDXL Euler run, we extract ten scalar signals of U-Net state: two
          CFG-gap measures, two predicted-x₀ stability measures, two cross-attention
          concentration measures, two noise-prediction norms, and two high-frequency
          power measures. Labels come from a PickScore-based progress rule with τ=0.80.
          The classifier is a single balanced logistic regression evaluated under 5-fold
          prompt-grouped cross-validation with 500 cluster-bootstrap resamples for 95%
          CIs. Cross-scheduler evaluation uses a paired 500-prompt subset under
          DPM-Solver++ 2M (20 steps) and DDIM (50 steps), with per-scheduler threshold
          recalibration on a disjoint 100-prompt held-out set.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Acknowledgments</h2>
        <p className="text-[13px] text-neutral-700 max-w-3xl">
          Collection ran on A100 Colab Pro+ under a custom producer–consumer I/O pipeline
          that kept GPU utilisation at 0.98 during the 2.2-hour collection run. Paper
          figures were produced with matplotlib; the webapp is Next.js + Tailwind,
          statically exported and deployed on GitHub Pages, with images on Cloudflare R2.
        </p>
      </section>
    </main>
  );
}
