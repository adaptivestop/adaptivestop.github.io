"use client";
import { useEffect, useMemo, useState } from "react";
import type { Core, Trajectories, Prompt } from "@/lib/types";
import SchedulerPanel from "@/components/SchedulerPanel";
import PromptList from "@/components/PromptList";

type SortKey = "default" | "stop_asc" | "stop_desc" | "qloss_desc" | "corpus";
type StopBucket = "any" | "early" | "mid" | "late" | "never";

export default function SimPage() {
  const [core, setCore]    = useState<Core | null>(null);
  const [data, setData]    = useState<Trajectories | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [query, setQuery]      = useState("");
  const [corpus, setCorpus]    = useState<string>("All");
  const [onlyMulti, setOnlyMulti] = useState(false);
  const [stopBucket, setStopBucket] = useState<StopBucket>("any");
  const [sort, setSort]        = useState<SortKey>("default");

  useEffect(() => {
    fetch("/data/core.json").then(r => r.json()).then(setCore);
    fetch("/data/trajectories.json").then(r => r.json()).then(setData);
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [] as Prompt[];
    const q = query.trim().toLowerCase();
    const inBucket = (p: Prompt): boolean => {
      const s = p.euler?.stop_step;
      if (s === undefined) return stopBucket === "any";
      switch (stopBucket) {
        case "any":   return true;
        case "early": return s <= 15;
        case "mid":   return s > 15 && s < 30;
        case "late":  return s >= 20 && s < 30;
        case "never": return s === 30;
      }
    };
    let rows = data.prompts.filter(p => {
      if (corpus !== "All" && p.corpus !== corpus) return false;
      if (onlyMulti && !(p.dpm && p.ddim)) return false;
      if (!inBucket(p)) return false;
      if (!q) return true;
      return p.text.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });

    switch (sort) {
      case "stop_asc":
        rows = [...rows].sort((a, b) => (a.euler?.stop_step ?? 99) - (b.euler?.stop_step ?? 99));
        break;
      case "stop_desc":
        rows = [...rows].sort((a, b) => (b.euler?.stop_step ?? -1) - (a.euler?.stop_step ?? -1));
        break;
      case "qloss_desc":
        rows = [...rows].sort((a, b) => (b.euler?.quality_loss ?? -1) - (a.euler?.quality_loss ?? -1));
        break;
      case "corpus":
        rows = [...rows].sort((a, b) => a.corpus.localeCompare(b.corpus) || a.id.localeCompare(b.id));
        break;
      default: break;
    }
    return rows;
  }, [data, query, corpus, onlyMulti, stopBucket, sort]);

  // Keep the selected prompt valid as filters change; if not in current list, pick first.
  useEffect(() => {
    if (filtered.length === 0) return;
    if (!selectedId || !filtered.find(p => p.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => (filtered.find(p => p.id === selectedId) ?? filtered[0] ?? null),
    [filtered, selectedId]
  );

  const pickRandom = () => {
    if (filtered.length === 0) return;
    const r = filtered[Math.floor(Math.random() * filtered.length)];
    setSelectedId(r.id);
  };

  if (!core || !data) return <main className="p-8 text-neutral-600">loading…</main>;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Simulator</h1>
        <p className="text-[13px] text-neutral-600 max-w-3xl">
          Each prompt shows the decoded image at every checkpoint with the classifier's
          per-step P(continue) and STOP/CONTINUE decision. The red box marks where
          AdaptiveStop would halt; darker-bordered tiles mark the reference end-of-run
          image. All 2,419 pooled prompts are Euler-evaluated; the 500-prompt paired
          cross-scheduler subset also has DPM-Solver++ and DDIM panels.
        </p>
      </header>

      {/* Filter / sort toolbar */}
      <section className="bg-white border border-neutral-300 p-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="search prompt text or ID…"
          className="flex-1 min-w-[220px] border border-neutral-400 bg-white px-3 py-1.5 text-sm"
        />

        <Control label="corpus">
          <select
            value={corpus}
            onChange={e => setCorpus(e.target.value)}
            className="border border-neutral-400 bg-white px-2 py-1 text-sm"
          >
            {["All", "PartiPrompts", "COCO", "DrawBench"].map(c =>
              <option key={c} value={c}>{c}</option>
            )}
          </select>
        </Control>

        <Control label="stop step">
          <select
            value={stopBucket}
            onChange={e => setStopBucket(e.target.value as StopBucket)}
            className="border border-neutral-400 bg-white px-2 py-1 text-sm"
            title="Filter by where AdaptiveStop chose to halt (Euler, 30-step)"
          >
            <option value="any">any</option>
            <option value="early">early (≤15)</option>
            <option value="mid">mid (16–24)</option>
            <option value="late">late (20–29)</option>
            <option value="never">never (=30)</option>
          </select>
        </Control>

        <Control label="sort">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="border border-neutral-400 bg-white px-2 py-1 text-sm"
          >
            <option value="default">default</option>
            <option value="stop_asc">stop step ↑ (earliest first)</option>
            <option value="stop_desc">stop step ↓ (latest first)</option>
            <option value="qloss_desc">quality loss ↓ (worst first)</option>
            <option value="corpus">corpus</option>
          </select>
        </Control>

        <label className="flex items-center gap-1.5 text-xs text-neutral-700 pl-1 border-l border-neutral-300 ml-1">
          <input
            type="checkbox"
            checked={onlyMulti}
            onChange={e => setOnlyMulti(e.target.checked)}
            className="accent-neutral-900"
          />
          cross-scheduler only
        </label>

        <button
          onClick={pickRandom}
          className="border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100 ml-auto"
          title="Jump to a random prompt from the current filter"
        >
          ⤳ random
        </button>
        <span className="text-xs text-neutral-500 tabular-nums">
          {filtered.length.toLocaleString()} prompt{filtered.length === 1 ? "" : "s"}
        </span>
      </section>

      {/* Two-column: list + selected detail */}
      <section className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
        <PromptList
          prompts={filtered}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />

        {selected ? (
          <div className="space-y-4">
            <div className="bg-white border border-neutral-300 p-4 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                {selected.corpus} &nbsp;·&nbsp; {selected.id}
                {selected.category ? " · " + selected.category : ""}
              </div>
              <div className="text-[15px] text-neutral-900 leading-snug">{selected.text}</div>
            </div>

            {selected.euler && <SchedulerPanel name="Euler (30 steps)"            keyName="euler" trajectory={selected.euler} />}
            {selected.dpm   && <SchedulerPanel name="DPM-Solver++ 2M (20 steps)"  keyName="dpm"   trajectory={selected.dpm} />}
            {selected.ddim  && <SchedulerPanel name="DDIM (50 steps)"             keyName="ddim"  trajectory={selected.ddim} />}
          </div>
        ) : (
          <div className="bg-white border border-neutral-300 p-6 text-neutral-500 text-sm">
            No prompt matches the current filters.
          </div>
        )}
      </section>

      {/* How to read */}
      <section className="text-[11px] text-neutral-500 pt-3 border-t border-neutral-300 space-y-1">
        <div>
          <span className="inline-block w-[14px] h-[14px] bg-[#b02a2a] align-middle"/> early stop (≤15) &nbsp;·&nbsp;
          <span className="inline-block w-[14px] h-[14px] bg-neutral-600 align-middle"/> mid (16–24) &nbsp;·&nbsp;
          <span className="inline-block w-[14px] h-[14px] bg-neutral-400 align-middle"/> late (25–29) &nbsp;·&nbsp;
          <span className="inline-block w-[14px] h-[14px] bg-neutral-300 align-middle"/> never (30)
        </div>
        <div>
          Image borders — <span className="text-[#b02a2a] font-bold">red</span>: AdaptiveStop's chosen stop;
          <span className="text-neutral-900 font-bold"> dark</span>: reference end-of-run;
          grey: reached; pale: not reached.
        </div>
        <div>
          P(continue) bars — column heights show the classifier's per-step probability;
          dashed line is the (calibrated) decision threshold t<sup>★</sup>.
        </div>
      </section>
    </main>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1 text-xs text-neutral-600">
      <span className="uppercase tracking-wider text-[10px]">{label}</span>
      {children}
    </label>
  );
}
