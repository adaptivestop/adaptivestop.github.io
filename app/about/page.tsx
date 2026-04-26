"use client";



export default function AboutPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">About</h1>
      </header>



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
        <h2 className="text-lg font-bold">Data &amp; artifacts</h2>
        <ul className="text-[14px] leading-relaxed text-neutral-800 list-disc pl-5 space-y-1">
          <li>
            <b>Images</b> (per-checkpoint 256×256 JPEGs, 19,994 total across three schedulers)
            are served from a public CDN bucket; URLs are embedded in the simulator's JSON so
            any prompt can be rendered without any server-side computation.
          </li>
          <li>
            <b>Signals CSVs</b> (14,994 rows for pooled Euler; 2,500 each for DPM-Solver++ and DDIM)
            and result JSONs are provided in the supplementary material.
          </li>
          <li>
            <b>Paper source</b> (TeX, figures, bibliography) is included in the supplementary archive.
          </li>
          <li>
            <b>Collection harness</b> (mp-queue I/O pipeline, collector wrapper, signal library)
            is included in the supplementary archive.
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
        <h2 className="text-lg font-bold">Reproducibility</h2>
        <p className="text-[13px] text-neutral-700 max-w-3xl">
          All headline numbers on this site come from the same CSV/JSON artifacts included in
          the supplementary archive. The webapp is a static client-side renderer; it performs
          no computation on the server side. Image traffic flows directly from the visitor's
          browser to a public CDN bucket, independent of this site's host.
        </p>
      </section>
    </main>
  );
}
