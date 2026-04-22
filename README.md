# SignalStop — research hub

Next.js 14 webapp that serves the SignalStop paper's full research artefact: the
compiled PDF, all 11 figures, the per-prompt simulator (500 paired prompts across
Euler / DPM-Solver++ / DDIM), interactive ablation widgets, and the pre-registered
success-criteria scorecard. Greyscale-first, deployable to Vercel.

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
- **`trajectories.json`** — 500 prompts × 3 schedulers × per-step signals/pickscore/pred/image-URL
- **`ablations.json`** — τ sweep, group LOO, per-corpus, LR coefficients
- **`transfer.json`** — cross-scheduler uncalibrated + calibrated metrics + gates

Images (19,994 JPEGs at 256×256) live in a public Cloudflare R2 bucket.
`trajectories.json` embeds the R2 URLs directly so no server roundtrip is needed.

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
cd webapp
npm install
npm run dev          # http://localhost:3000
```

## Deploy to Vercel

```bash
cd webapp
npx vercel           # first time — login + link
npx vercel --prod    # production
```

The deployment is tiny (~5 MB: code + JSON + figure PDFs + paper PDF).
All image traffic goes to Cloudflare R2, not Vercel — zero bandwidth impact
on the free tier.

## Secrets

R2 credentials live in `webapp/.env.r2` (git-ignored). The public R2 URL is
committed (it's public by design) but upload credentials are not.
