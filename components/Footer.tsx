import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-300 bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-start gap-4 md:gap-10">

        {/* Project + paper */}
        <div className="space-y-1 flex-1">
          <div className="text-[13px] font-bold text-neutral-900 tracking-tight">AdaptiveStop</div>
          <div className="text-[11px] text-neutral-600 leading-snug max-w-sm">
            Companion site to <i>Learning to Stop: Process-Signal Early Exit for Diffusion Models</i>.
            Gurmessa &amp; Akram, 2026.
          </div>
        </div>

        {/* Affiliation */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Affiliation</div>
          <div className="text-[12px] text-neutral-800 leading-snug">
            Department of Computer &amp; Data Sciences<br />
            University of St.&nbsp;Thomas
          </div>
        </div>

        {/* Links */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Explore</div>
          <ul className="text-[12px] leading-snug space-y-0.5">
            <li><Link href="/paper"     className="text-neutral-700 hover:text-neutral-900 hover:underline">Paper</Link></li>
            <li><Link href="/sim"       className="text-neutral-700 hover:text-neutral-900 hover:underline">Simulator</Link></li>
            <li><Link href="/ablations" className="text-neutral-700 hover:text-neutral-900 hover:underline">Ablations</Link></li>
            <li><Link href="/results"   className="text-neutral-700 hover:text-neutral-900 hover:underline">Results</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
