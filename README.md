# AdaptiveStop — research hub

Next.js 14 webapp that serves the AdaptiveStop paper's full research artefact: the
compiled PDF, all 11 figures, the per-prompt simulator (2,419 Euler-evaluated
prompts with 476 also paired across DPM-Solver++ and DDIM), interactive ablation
widgets, and the pre-registered success-criteria scorecard. Greyscale-first,
statically exported, deployed to GitHub Pages.

**Live:** <https://adaptivestop.github.io>

## Routes

| path | what |
|------|------|
| `/`          | landing page, headline metrics, mechanistic callout |
| `/sim`       | per-prompt simulator: three-scheduler image grid with per-step classifier decisions |
| `/ablations` | τ-sweep slider, leave-one-group-out ΔAUC, LR coefficients, per-corpus table |
| `/results`   | pre-registered criteria, v9-cohort replication, cross-scheduler transfer table + gates |
| `/paper`     | PDF viewer + figure gallery (11 figures) |
| `/about`     | authors, methodology summary, BibTeX copy-to-clipboard |

## Data layer

The webapp reads four JSON files from `public/data/`:

- **`core.json`** — meta, headline numbers, criteria, v9-replication deltas
- **`trajectories.json`** — 2,419 prompts × signals/pickscore/pred/image-URL (476 of them also carry DPM-Solver++ and DDIM panels)
- **`ablations.json`** — τ sweep, group LOO, per-corpus, LR coefficients
- **`transfer.json`** — cross-scheduler uncalibrated + calibrated metrics + gates

Images (19,994 JPEGs at 256×256) live in a public Cloudflare R2 bucket.
`trajectories.json` embeds the R2 URLs directly so no server round-trip is needed.

## Rebuilding data after new experiments

```bash
# 1. If you ran new GPU collection, upload new images to R2
python webapp/scripts/upload_to_r2.py

# 2. Rebuild all JSON artefacts from the v10 CSVs + result JSONs on disk
python webapp/scripts/build_webapp_data.py
```

Both scripts are resumable and idempotent.

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export -> out/
```

## Deploy to GitHub Pages

The repository `adaptivestop/adaptivestop.github.io` has a GitHub Actions workflow
at `.github/workflows/pages.yml` that builds and deploys on every push to `main`.
Requirements (one-time):

1. Repo is **public** (GH Pages free tier requirement).
2. **Settings → Pages → Source** is set to **GitHub Actions**.

Then every `git push origin main` rebuilds the site. Deployment is tiny
(~12 MB: code + JSON + figure PDFs + paper PDF). All image traffic goes to
Cloudflare R2, not GH Pages — zero bandwidth impact.

## Secrets

R2 credentials live in `webapp/.env.r2` on the developer's machine (git-ignored).
The public R2 URL is committed (it's public by design) but the upload access key
and secret are not. The deployed site only needs the public URL.
