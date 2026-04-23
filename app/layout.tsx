import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdaptiveStop — Process-Signal Early Exit for Diffusion Models",
  description:
    "Research hub for AdaptiveStop: per-image early exit for SDXL via internal U-Net signals. "
  + "ROC-AUC 0.933 at 32.6% compute savings across 2,419 prompts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-neutral-900 antialiased bg-neutral-100">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
