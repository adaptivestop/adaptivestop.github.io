"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/",           label: "Home" },
  { href: "/sim",        label: "Simulator" },
  { href: "/ablations",  label: "Ablations" },
  { href: "/results",    label: "Results" },
  { href: "/paper",      label: "Paper" },
  { href: "/about",      label: "About" },
];

export default function Nav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="border-b border-neutral-300 bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center gap-6">
        <Link href="/" className="font-bold tracking-tight text-neutral-900">
          <span className="mr-2">●</span>SignalStop
        </Link>
        <ul className="flex items-center gap-1 text-sm overflow-x-auto">
          {ITEMS.filter(i => i.href !== "/").map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={
                    "px-3 py-1 border transition whitespace-nowrap " +
                    (active
                      ? "border-neutral-900 bg-neutral-900 text-neutral-50"
                      : "border-transparent text-neutral-700 hover:bg-neutral-100")
                  }
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto text-[10px] text-neutral-500 hidden md:block">
          v10 · 2499 prompts · Euler / DPM++ / DDIM
        </div>
      </div>
    </nav>
  );
}
