import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalStop — Process-Signal Early Exit for Diffusion Models",
  description:
    "Research hub for SignalStop: per-image early exit for SDXL via internal U-Net signals. "
  + "ROC-AUC 0.933 at 32.6% compute savings across 2,419 prompts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-neutral-900 antialiased bg-neutral-100">
        <Nav />
        {children}
        <footer className="max-w-6xl mx-auto px-4 md:px-8 py-6 mt-10 text-[11px] text-neutral-500 border-t border-neutral-300">
          Gurmessa &amp; Akram · v10 evaluation harness · images served from Cloudflare R2.
        </footer>
      </body>
    </html>
  );
}
