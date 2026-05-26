import Link from "next/link";

export default function Nav() {
  return (
    <nav className="border-b border-neutral-300 bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center">
        <Link href="/" className="font-bold tracking-tight text-neutral-900 text-[15px]">
          AdaptiveStop
        </Link>
      </div>
    </nav>
  );
}
