/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for GitHub Pages (adaptivestop.github.io).
  // GH Pages serves files directly with no server, so every route must
  // be pre-rendered at build time.
  output: "export",
  // Trailing slashes make routes resolve cleanly against directory-style
  // static hosting (e.g. /sim -> /sim/index.html).
  trailingSlash: true,
  // next/image Optimizer needs a server; GH Pages has none.
  // R2-hosted <img> tags don't use next/image anyway, so this is a no-op
  // for our trajectory images; it only affects any future next/image usage.
  images: { unoptimized: true },
};
export default nextConfig;
