"use client";
import { useEffect, useMemo, useState } from "react";
import type { Core, Trajectories, Prompt } from "@/lib/types";
import SchedulerPanel from "@/components/SchedulerPanel";

export default function SimPage() {
  const [core, setCore]    = useState<Core | null>(null);
  const [data, setData]    = useState<Trajectories | null>(null);
  const [idx, setIdx]      = useState(0);
  const [query, setQuery]  = useState("");
  const [corpus, setCorpus]= useState<string>("All");
  const [onlyMulti, setOnlyMulti] = useState(false);

  useEffect(() => {
    fetch("/data/core.json").then(r => r.json()).then(setCore);
    fetch("/data/trajectories.json").then(r => r.json()).then(setData);
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [] as Prompt[];
    const q = query.trim().toLowerCase();
    return data.prompts.filter(p => {
      if (corpus !== "All" && p.corpus !== corpus) return false;
      if (onlyMulti && !(p.dpm && p.ddim)) return false;
      if (!q) return true;
      return p.text.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [data, query, corpus, onlyMulti]);

  const t = filtered[idx];

  if (!core || !data) return <main className="p-8 text-neutral-600">loading…</main>;
  if (!t)             return <main className="p-8 text-neutral-600">no match for filters</main>;

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Simulator</h1>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Each prompt shows the decoded image at every checkpoint of its evaluated
          schedulers, with the classifier's per-step P(continue) and STOP/CONTINUE
          decision. The red box marks where AdaptiveStop would halt; darker-bordered tiles
          mark the reference end-of-run image. All 2,419 pooled prompts are Euler-evaluated;
          the 500-prompt paired cross-scheduler subset also has DPM-Solver++ and DDIM panels.
        </p>
      </header>

      {/* Controls */}
      <section className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-300">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setIdx(0); }}
          placeholder="search prompt text or ID..."
          className="flex-1 min-w-[240px] border border-neutral-400 bg-white px-3 py-1.5 text-sm"
        />
        <select
          value={corpus}
          onChange={e => { setCorpus(e.target.value); setIdx(0); }}
          className="border border-neutral-400 bg-white px-2 py-1.5 text-sm"
        >
          {["All", "PartiPrompts", "COCO", "DrawBench"].map(c =>
            <option key={c} value={c}>{c}</option>
          )}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-neutral-700">
          <input
            type="checkbox"
            checked={onlyMulti}
            onChange={e => { setOnlyMulti(e.target.checked); setIdx(0); }}
            className="accent-neutral-900"
          />
          cross-scheduler only
        </label>
        <div className="text-xs text-neutral-500 tabular-nums ml-2">{idx + 1} / {filtered.length}</div>
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          className="border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100">
          ‹ prev
        </button>
        <button
          onClick={() => setIdx(i => Math.min(filtered.length - 1, i + 1))}
          className="border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100">
          next ›
        </button>
      </section>

      {/* Prompt card */}
      <section className="bg-white border border-neutral-300 p-4 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">
          {t.corpus} &nbsp;·&nbsp; {t.id}
          {t.category ? " · " + t.category : ""}
        </div>
        <div className="text-[15px] text-neutral-900 leading-snug">{t.text}</div>
      </section>

      {/* Three scheduler panels stacked */}
      <section className="space-y-4">
        {t.euler && <SchedulerPanel name="Euler (30 steps)"         keyName="euler" trajectory={t.euler} />}
        {t.dpm   && <SchedulerPanel name="DPM-Solver++ 2M (20 steps)" keyName="dpm"   trajectory={t.dpm} />}
        {t.ddim  && <SchedulerPanel name="DDIM (50 steps)"           keyName="ddim"  trajectory={t.ddim} />}
      </section>

      {/* How to read */}
      <section className="text-[11px] text-neutral-500 pt-4 border-t border-neutral-300 space-y-1">
        <div>Image borders — <span className="text-[#b02a2a] font-bold">red</span>: AdaptiveStop's chosen stop; <span className="text-neutral-900 font-bold">dark</span>: reference end-of-run; grey: reached; pale: not reached.</div>
        <div>P(continue) bars — column heights show the classifier's per-step probability; dashed line is the (calibrated) decision threshold t<sup>★</sup>.</div>
      </section>
    </main>
  );
}
