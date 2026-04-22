// Types matching the JSONs produced by webapp/scripts/build_webapp_data.py.

export type SchedulerKey = "euler" | "dpm" | "ddim";

export type SchedulerSpec = {
  full_name: string;
  ref_step: number;
  checkpoints: number[];
};

export type Core = {
  meta: {
    version: string;
    tau_default: number;
    r2_base: string;
    seed: number;
    n_prompts_raw: number;
    n_prompts_pooled: number;
    schedulers: Record<SchedulerKey, SchedulerSpec>;
    signals_order: string[];
  };
  headline: {
    roc_auc: number;
    roc_auc_ci95: [number, number] | null;
    f1_stop: number;
    f1_stop_ci95: [number, number] | null;
    bal_acc: number;
    savings_pct: number;
    avg_stop: number;
    mean_qloss: number;
    med_qloss: number;
    p90_qloss: number;
    p95_qloss: number;
    stop_prevalence_pct: number;
  };
  criteria: Record<string, {
    target?: number;
    measured?: number;
    tol?: number;
    pass: boolean;
  }>;
  all_primary_pass: boolean;
  v9_replication: {
    v10_measured_tau09: { roc_auc: number; f1_stop: number; n_prompts: number };
    v10_measured_tau08: { roc_auc: number; f1_stop: number; n_prompts: number };
    v9_reference_tau09: { roc_auc: number; f1_stop: number };
  };
  cross_scheduler_summary: {
    delta_auc_dpm: number;
    delta_auc_ddim: number;
  };
};

export type Decision = "stop" | "continue";

export type SchedulerTrajectory = {
  ref_step: number;
  t_star: number;
  pickscore: Record<number, number>;
  progress: Record<number, number>;
  signals: Record<number, Record<string, number>>;
  pred: Record<number, Decision>;
  prob_continue: Record<number, number>;
  stop_step: number;
  quality_loss: number;
  savings_pct: number;
  images: Record<number, string>;
  pred_uncalibrated?: Record<number, Decision>;
  stop_step_uncal?: number;
  savings_uncal_pct?: number;
  quality_loss_uncal?: number;
};

export type Prompt = {
  id: string;
  text: string;
  category?: string;
  corpus: "PartiPrompts" | "COCO" | "DrawBench";
  euler?: SchedulerTrajectory;
  dpm?: SchedulerTrajectory;
  ddim?: SchedulerTrajectory;
};

export type Trajectories = { prompts: Prompt[] };

export type Ablations = {
  tau_sweep: Array<{
    tau: number; n_prompts: number; stop_overall_pct: number;
    f1_stop: number; roc_auc: number;
    avg_stop: number; savings_pct: number;
    mean_qloss: number; med_qloss: number;
    p90_qloss: number; p95_qloss: number;
    pct_qloss_le_0_02: number;
  }>;
  group_loo: Array<{
    removed: string; n_features: number;
    f1_stop: number; roc_auc: number;
    bal_acc: number; delta_auc: number;
  }>;
  by_corpus: Array<{
    tau: string; corpus: string;
    n_prompts: number; n_rows: number;
    stop_pct: number; bal_acc: number;
    f1_stop: number; roc_auc: number;
  }>;
  coefficients: Array<{ signal: string; coef: number; abs_coef: number }>;
};

export type TransferScheduler = {
  ref_step: number;
  t_star: number;
  uncalibrated: {
    n_prompts: number; stop_pct: number;
    bal_acc: number; prec_stop: number; rec_stop: number;
    f1_stop: number; roc_auc: number;
    avg_stop: number; savings_pct: number;
    mean_qloss: number; med_qloss: number; p90_qloss: number;
  };
  calibrated: TransferScheduler["uncalibrated"];
};

export type Transfer = {
  protocol: {
    tau: number;
    calib_n_prompts: number;
    test_n_prompts: number;
    calibration_objective: string;
    t_grid_step: number;
    seed: number;
  };
  euler: TransferScheduler;
  dpm: TransferScheduler;
  ddim: TransferScheduler;
  by_corpus: Array<{
    scheduler: string; corpus: string;
    n_prompts: number; stop_pct: number;
    f1_stop: number; roc_auc: number;
  }>;
  gates: {
    auc: Record<string, {
      euler_auc: number; target_auc?: number; delta: number;
      tol: number; pass: boolean;
    }>;
    policy: Record<string, { pass: boolean; ratio?: number }>;
  };
};
