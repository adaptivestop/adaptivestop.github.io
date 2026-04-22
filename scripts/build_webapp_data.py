"""
Build the webapp's data layer from the v10 artifacts on disk.

Produces four JSON files under webapp/public/data/:

    core.json          meta, headline numbers, signals order, R2 base URL
    trajectories.json  per-prompt signals + pickscore + pred for the 500 paired prompts
                       across all three schedulers (Euler / DPM++ / DDIM)
    ablations.json     tau sweep + group LOO + per-corpus + LR coefficients
    transfer.json      cross-scheduler: uncalibrated + calibrated metrics and gates

Also copies the 11 paper figures into webapp/public/figures/ so the /paper
page can link to them locally (not via R2 — they're tiny).

Run (from repo root):
    python webapp/scripts/build_webapp_data.py
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.linear_model   import LogisticRegression
from sklearn.preprocessing  import StandardScaler
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import (
    balanced_accuracy_score, f1_score, roc_auc_score,
)


# --------- paths -----------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
WEBAPP_DIR = SCRIPT_DIR.parent
REPO_ROOT  = WEBAPP_DIR.parent
V10_DIR    = REPO_ROOT / "harness_v10"
DATA_DIR   = V10_DIR / "data"
FIGURES_SRC = REPO_ROOT / "paper" / "figures"

OUT_DATA    = WEBAPP_DIR / "public" / "data"
OUT_FIGURES = WEBAPP_DIR / "public" / "figures"
OUT_DATA.mkdir(parents=True, exist_ok=True)
OUT_FIGURES.mkdir(parents=True, exist_ok=True)

# --------- constants -------------------------------------------------------
SIGNALS = [
    "cfg_gap_norm", "cfg_gap_cumulative",
    "x0_mse", "x0_cosine",
    "cross_attn_entropy", "cross_attn_max",
    "eps_norm", "eps_norm_delta",
    "hf_power_ratio", "hf_power_delta",
]

SCHEDULER_SPECS = {
    "euler": {"full_name": "Euler Discrete",    "ref_step": 30, "checkpoints": [5, 10, 15, 20, 25, 30]},
    "dpm":   {"full_name": "DPM-Solver++ 2M",    "ref_step": 20, "checkpoints": [4, 8, 12, 16, 20]},
    "ddim":  {"full_name": "DDIM",               "ref_step": 50, "checkpoints": [10, 20, 30, 40, 50]},
}

TAU = 0.80


# --------- labeling / classifier helpers ----------------------------------
def relabel(df_full, ref_step, threshold=TAU, min_gain=0.5):
    first_step = df_full["step"].min()
    df = df_full[df_full["step"] != ref_step].copy()
    ps_first = df_full[df_full["step"]==first_step].set_index(["prompt_id","seed"])["pickscore"].rename("ps_first")
    ps_ref   = df_full[df_full["step"]==ref_step  ].set_index(["prompt_id","seed"])["pickscore"].rename("ps_ref")
    stats = pd.concat([ps_first, ps_ref], axis=1)
    stats["total_gain"] = stats["ps_ref"] - stats["ps_first"]
    df = df.merge(stats[["ps_first","ps_ref","total_gain"]], left_on=["prompt_id","seed"], right_index=True)
    if min_gain is not None:
        bad = df.loc[df["total_gain"] < min_gain, "prompt_id"].unique()
        df = df[~df["prompt_id"].isin(bad)].copy()
    df["progress"] = ((df["pickscore"] - df["ps_first"]) / df["total_gain"]).clip(0.0, 1.0)
    df["label"]    = (df["progress"] < threshold).astype(int)
    for col, val in [("x0_mse",0.0),("x0_cosine",1.0),("eps_norm_delta",0.0),("hf_power_delta",0.0)]:
        df.loc[df["step"]==first_step, col] = df.loc[df["step"]==first_step, col].fillna(val)
    return df


def corpus_of(pid: str) -> str:
    if pid.startswith("parti_"):     return "PartiPrompts"
    if pid.startswith("coco_"):      return "COCO"
    if pid.startswith("drawbench_"): return "DrawBench"
    return "other"


# --------- build core.json -------------------------------------------------
def build_core(r2_base: str) -> dict[str, Any]:
    pooled   = json.load(open(DATA_DIR / "results_pooled.json"))
    criteria = json.load(open(DATA_DIR / "v10_criteria.json"))
    v9sub    = json.load(open(DATA_DIR / "results_v9_subset.json"))
    transfer = json.load(open(DATA_DIR / "results_transfer_calibrated.json"))
    xcrit    = json.load(open(DATA_DIR / "v10_cross_scheduler_calibrated_criteria.json"))

    p80 = pooled["pooled_results"]["0.8"]
    return {
        "meta": {
            "version":         "v10",
            "tau_default":     TAU,
            "r2_base":         r2_base,
            "seed":            42,
            "n_prompts_raw":   pooled["n_prompts_raw"],
            "n_prompts_pooled": p80["n_prompts_post_filter"],
            "schedulers":      SCHEDULER_SPECS,
            "signals_order":   SIGNALS,
        },
        "headline": {
            "roc_auc":       p80["roc_auc"],
            "roc_auc_ci95":  p80.get("roc_auc_ci95"),
            "f1_stop":       p80["f1_stop"],
            "f1_stop_ci95":  p80.get("f1_stop_ci95"),
            "bal_acc":       p80["bal_acc"],
            "savings_pct":   p80["savings_pct"],
            "avg_stop":      p80["avg_stop"],
            "mean_qloss":    p80["mean_qloss"],
            "med_qloss":     p80["med_qloss"],
            "p90_qloss":     p80["p90_qloss"],
            "p95_qloss":     p80["p95_qloss"],
            "stop_prevalence_pct": p80["stop_prevalence_pct"],
        },
        "criteria":           criteria["criteria"],
        "all_primary_pass":   criteria["all_pass"],
        "v9_replication": {
            "v10_measured_tau09": v9sub["v9_subset_tau0_90"],
            "v10_measured_tau08": v9sub["v9_subset_tau0_80"],
            "v9_reference_tau09": v9sub["v9_reference_tau0_90"],
        },
        "cross_scheduler_summary": {
            "delta_auc_dpm":  xcrit["auc_criteria"]["DPM++_auc_drop_le_0.03"]["delta"],
            "delta_auc_ddim": xcrit["auc_criteria"]["DDIM_auc_drop_le_0.05"]["delta"],
        },
    }


# --------- build ablations.json -------------------------------------------
def build_ablations(df_pooled: pd.DataFrame) -> dict[str, Any]:
    tau_sweep   = pd.read_csv(DATA_DIR / "results_tau_sweep.csv").to_dict(orient="records")
    group_loo   = pd.read_csv(DATA_DIR / "results_group_loo.csv").to_dict(orient="records")
    by_corpus   = pd.read_csv(DATA_DIR / "results_by_corpus.csv").to_dict(orient="records")

    # Recompute standardised LR coefficients at τ=0.80 on pooled (representative direction)
    df_t = relabel(df_pooled, ref_step=30, threshold=TAU, min_gain=0.5)
    scaler = StandardScaler().fit(df_t[SIGNALS].values)
    clf = LogisticRegression(C=1.0, class_weight="balanced", max_iter=1000, random_state=42).fit(
        scaler.transform(df_t[SIGNALS].values), df_t["label"].values
    )
    coefs = pd.DataFrame({
        "signal": SIGNALS,
        "coef":   clf.coef_[0].tolist(),
        "abs_coef": np.abs(clf.coef_[0]).tolist(),
    }).sort_values("abs_coef", ascending=False).to_dict(orient="records")

    return {
        "tau_sweep":     tau_sweep,
        "group_loo":     group_loo,
        "by_corpus":     by_corpus,
        "coefficients":  coefs,
    }


# --------- build transfer.json --------------------------------------------
def build_transfer() -> dict[str, Any]:
    cal = json.load(open(DATA_DIR / "results_transfer_calibrated.json"))
    by_corp = pd.read_csv(DATA_DIR / "results_transfer_calibrated_by_corpus.csv").to_dict(orient="records")
    xcrit = json.load(open(DATA_DIR / "v10_cross_scheduler_calibrated_criteria.json"))

    def _compact(R):
        return {
            "ref_step":            R["ref_step"],
            "t_star":              R["t_star"],
            "uncalibrated":        R["uncalibrated_TEST"],
            "calibrated":          R["calibrated_TEST"],
        }

    return {
        "protocol": cal["protocol"],
        "euler":    _compact(cal["euler_reference"]),
        "dpm":      _compact(cal["dpm"]),
        "ddim":     _compact(cal["ddim"]),
        "by_corpus": by_corp,
        "gates": {
            "auc":    xcrit["auc_criteria"],
            "policy": xcrit["policy_criteria"],
        },
    }


# --------- build trajectories.json (per-prompt, multi-scheduler) -----------
def build_trajectories(df_euler: pd.DataFrame,
                       df_dpm:   pd.DataFrame,
                       df_ddim:  pd.DataFrame,
                       subset_prompts: list[dict],
                       r2_base: str) -> dict[str, Any]:
    """
    For each of the 500 paired prompts, emit all three schedulers' trajectory
    data: per-step signals, pickscore, progress, classifier prob and decision,
    plus stopping-simulation summary.
    """
    # --- train the frozen Euler classifier (same as 05/05b) ---
    df_eu_lab = relabel(df_euler, ref_step=30, threshold=TAU, min_gain=0.5)
    scaler = StandardScaler().fit(df_eu_lab[SIGNALS].values)
    clf = LogisticRegression(C=1.0, class_weight="balanced", max_iter=1000, random_state=42).fit(
        scaler.transform(df_eu_lab[SIGNALS].values), df_eu_lab["label"].values
    )

    # --- also compute 5-fold OOF preds for Euler; used for honest per-prompt "what the model decided" on Euler ---
    y = df_eu_lab["label"].values
    X = scaler.transform(df_eu_lab[SIGNALS].values)
    groups = df_eu_lab["prompt_id"].values
    sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    oof_prob_eu = np.full(len(df_eu_lab), np.nan)
    oof_pred_eu = np.full(len(df_eu_lab), -1, dtype=int)
    for tr, te in sgkf.split(X, y, groups):
        sc_i = StandardScaler().fit(df_eu_lab.iloc[tr][SIGNALS].values)
        m    = LogisticRegression(C=1.0, class_weight="balanced", max_iter=1000, random_state=42).fit(
            sc_i.transform(df_eu_lab.iloc[tr][SIGNALS].values), y[tr]
        )
        X_te = sc_i.transform(df_eu_lab.iloc[te][SIGNALS].values)
        oof_prob_eu[te] = m.predict_proba(X_te)[:, 1]
        oof_pred_eu[te] = m.predict(X_te)
    df_eu_lab["prob"] = oof_prob_eu
    df_eu_lab["pred"] = oof_pred_eu

    # --- apply frozen classifier to DPM++ and DDIM ---
    dpm_lab  = relabel(df_dpm,  ref_step=20, threshold=TAU, min_gain=0.5)
    ddim_lab = relabel(df_ddim, ref_step=50, threshold=TAU, min_gain=0.5)
    for d in (dpm_lab, ddim_lab):
        X = scaler.transform(d[SIGNALS].values)
        d["prob"] = clf.predict_proba(X)[:, 1]
        d["pred"] = clf.predict(X)

    # Calibrated per-scheduler threshold (from 05b results)
    cal = json.load(open(DATA_DIR / "results_transfer_calibrated.json"))
    T_DPM  = cal["dpm"]["t_star"]
    T_DDIM = cal["ddim"]["t_star"]
    dpm_lab["pred_cal"]  = (dpm_lab["prob"].values  >= T_DPM).astype(int)
    ddim_lab["pred_cal"] = (ddim_lab["prob"].values >= T_DDIM).astype(int)

    # --- build per-prompt metadata lookup ---
    # Use the FULL pooled corpus metadata, not just the cross-scheduler subset,
    # so Euler-only prompts are still browseable in the simulator.
    all_prompts_meta = json.load(open(DATA_DIR / "prompts_2500.json"))
    meta_by_pid = {str(p["prompt_id"]): p for p in all_prompts_meta}
    # Ensure the cross-scheduler subset items (which may carry extra fields) win.
    for p in subset_prompts:
        meta_by_pid[str(p["prompt_id"])] = p

    # Master list of prompt IDs to emit: every prompt present in the pooled Euler CSV.
    pooled_pids = [str(pid) for pid in df_eu_lab["prompt_id"].unique()]

    def _sched_subtree(df_labeled, df_full, scheduler_key, ref_step,
                       use_pred_cal=False, image_dir=None):
        """Build dict: {step: {...}} for a given scheduler / prompt."""
        by_pid: dict[str, dict] = {}
        pred_col = "pred_cal" if use_pred_cal else "pred"

        # also need the raw pickscore per step (including ref step)
        for pid, g in df_full.groupby("prompt_id"):
            g = g.sort_values("step")
            ps_dict = {int(r["step"]): float(r["pickscore"]) for _, r in g.iterrows()}
            by_pid.setdefault(pid, {})["pickscore_all"] = ps_dict

        for pid, g in df_labeled.groupby("prompt_id"):
            g = g.sort_values("step")
            pickscore = by_pid[pid]["pickscore_all"]
            signals_per_step = {}
            pred_per_step    = {}
            prob_per_step    = {}
            progress_per_step = {}
            for _, r in g.iterrows():
                s = int(r["step"])
                signals_per_step[s]  = {k: float(r[k]) for k in SIGNALS}
                progress_per_step[s] = float(r["progress"])
                pred_per_step[s]     = "stop" if int(r[pred_col]) == 0 else "continue"
                prob_per_step[s]     = float(r["prob"])

            # Simulation: first STOP step using the chosen pred column
            stop = ref_step
            for s in sorted(pred_per_step):
                if pred_per_step[s] == "stop":
                    stop = s; break
            ps_s = pickscore.get(stop, pickscore[ref_step])
            qloss  = float(pickscore[ref_step] - ps_s)
            savings = float((ref_step - stop) / ref_step * 100)

            # R2 image URLs: step_05.jpeg, step_10.jpeg ...
            steps_all = sorted(pickscore.keys())
            images = {
                s: f"{r2_base}/{scheduler_key}/{pid}/step_{s:02d}.jpeg"
                for s in steps_all
            }
            by_pid[pid] = {
                "ref_step":      ref_step,
                "t_star":        (T_DPM if scheduler_key == "dpm"
                                  else T_DDIM if scheduler_key == "ddim"
                                  else 0.5),
                "pickscore":     pickscore,
                "progress":      progress_per_step,
                "signals":       signals_per_step,
                "pred":          pred_per_step,
                "prob_continue": prob_per_step,
                "stop_step":     int(stop),
                "quality_loss":  qloss,
                "savings_pct":   savings,
                "images":        images,
            }
        return by_pid

    eu_tree   = _sched_subtree(df_eu_lab, df_euler, "euler", 30, use_pred_cal=False)
    dpm_tree  = _sched_subtree(dpm_lab,   df_dpm,   "dpm",   20, use_pred_cal=True)  # use calibrated for operational truth
    ddim_tree = _sched_subtree(ddim_lab,  df_ddim,  "ddim",  50, use_pred_cal=True)

    # Also keep an UNCALIBRATED set of decisions on DPM++/DDIM for the ablation/sim pages
    dpm_tree_uncal  = _sched_subtree(dpm_lab,  df_dpm,  "dpm",  20, use_pred_cal=False)
    ddim_tree_uncal = _sched_subtree(ddim_lab, df_ddim, "ddim", 50, use_pred_cal=False)

    # --- assemble per-prompt records (all pooled prompts; some have cross-scheduler data) ---
    out = []
    for pid in pooled_pids:
        meta = meta_by_pid.get(pid, {})
        record = {
            "id":       pid,
            "text":     meta.get("prompt") or meta.get("text") or "",
            "category": meta.get("category"),
            "corpus":   meta.get("corpus") or corpus_of(pid),
        }
        # Only emit schedulers where this prompt has full trajectory data
        # (post-degenerate-filter; some prompts drop under a specific scheduler's rule)
        if pid in eu_tree and "pred" in eu_tree[pid]:
            record["euler"] = eu_tree[pid]
        if pid in dpm_tree and "pred" in dpm_tree[pid]:
            record["dpm"] = dpm_tree[pid]
            if pid in dpm_tree_uncal and "pred" in dpm_tree_uncal[pid]:
                record["dpm"]["pred_uncalibrated"]   = dpm_tree_uncal[pid]["pred"]
                record["dpm"]["stop_step_uncal"]     = dpm_tree_uncal[pid]["stop_step"]
                record["dpm"]["savings_uncal_pct"]   = dpm_tree_uncal[pid]["savings_pct"]
                record["dpm"]["quality_loss_uncal"]  = dpm_tree_uncal[pid]["quality_loss"]
        if pid in ddim_tree and "pred" in ddim_tree[pid]:
            record["ddim"] = ddim_tree[pid]
            if pid in ddim_tree_uncal and "pred" in ddim_tree_uncal[pid]:
                record["ddim"]["pred_uncalibrated"]  = ddim_tree_uncal[pid]["pred"]
                record["ddim"]["stop_step_uncal"]    = ddim_tree_uncal[pid]["stop_step"]
                record["ddim"]["savings_uncal_pct"]  = ddim_tree_uncal[pid]["savings_pct"]
                record["ddim"]["quality_loss_uncal"] = ddim_tree_uncal[pid]["quality_loss"]
        out.append(record)
    return {"prompts": out}


# --------- copy paper figures ---------------------------------------------
def copy_figures() -> None:
    n = 0
    for pdf in FIGURES_SRC.glob("fig*.pdf"):
        shutil.copy2(pdf, OUT_FIGURES / pdf.name)
        n += 1
    print(f"  copied {n} figure PDFs to {OUT_FIGURES}")


# --------- main ------------------------------------------------------------
def main() -> None:
    load_dotenv(WEBAPP_DIR / ".env.r2", override=False)
    r2_base = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")
    if not r2_base:
        print("ERROR: R2_PUBLIC_URL missing from .env.r2", file=sys.stderr); sys.exit(1)

    print(f"r2 base  : {r2_base}")
    print(f"v10 data : {DATA_DIR}")

    # Load all source data once.
    print("\n[1/5] loading CSVs ...")
    df_euler   = pd.read_csv(DATA_DIR / "dataset_full_euler_2500_v10.csv")
    df_dpm     = pd.read_csv(DATA_DIR / "dataset_full_dpmsolvermultistep_500_v10.csv")
    df_ddim    = pd.read_csv(DATA_DIR / "dataset_full_ddim_500_v10.csv")
    subset     = json.load(open(DATA_DIR / "prompts_cross500.json"))
    print(f"   Euler pooled rows     : {len(df_euler):>6}")
    print(f"   DPM++ rows            : {len(df_dpm):>6}")
    print(f"   DDIM rows             : {len(df_ddim):>6}")
    print(f"   paired 500 subset     : {len(subset):>6}")

    print("\n[2/5] building core.json ...")
    core = build_core(r2_base)
    (OUT_DATA / "core.json").write_text(json.dumps(core, indent=2, default=float))
    print(f"   -> {OUT_DATA/'core.json'}  ({(OUT_DATA/'core.json').stat().st_size/1024:.1f} KB)")

    print("\n[3/5] building ablations.json ...")
    abl = build_ablations(df_euler)
    (OUT_DATA / "ablations.json").write_text(json.dumps(abl, indent=2, default=float))
    print(f"   -> {OUT_DATA/'ablations.json'}  ({(OUT_DATA/'ablations.json').stat().st_size/1024:.1f} KB)")

    print("\n[4/5] building transfer.json ...")
    tr  = build_transfer()
    (OUT_DATA / "transfer.json").write_text(json.dumps(tr, indent=2, default=float))
    print(f"   -> {OUT_DATA/'transfer.json'}  ({(OUT_DATA/'transfer.json').stat().st_size/1024:.1f} KB)")

    print("\n[5/5] building trajectories.json (this trains the classifier; ~10s)...")
    traj = build_trajectories(df_euler, df_dpm, df_ddim, subset, r2_base)
    (OUT_DATA / "trajectories.json").write_text(json.dumps(traj, default=float))  # no indent -> smaller
    print(f"   -> {OUT_DATA/'trajectories.json'}  ({(OUT_DATA/'trajectories.json').stat().st_size/1024:.1f} KB)")

    print("\n[+] copying paper figures ...")
    copy_figures()

    # Remove the old stub if it exists (we don't need it anymore)
    stub = OUT_DATA / "trajectories.json.old"
    old  = OUT_DATA / "trajectories.json"
    if (OUT_DATA / "trajectories.full.json").exists():
        pass  # leave it

    print("\nDONE.")


if __name__ == "__main__":
    main()
