import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Emit a self-contained server (.next/standalone) so the Jenkins deploy ships
  // ~50 MB instead of rebuilding node_modules on the VPS. Run it with
  // `node server.js`, not `next start` — see ecosystem.config.js.
  output: "standalone",
  // Dev only. Turbopack's persistent dev cache (.next/dev/cache) was restoring a
  // stale app-route table on Windows, so routes added/changed while the server
  // was down (e.g. /dashboard/workbench/patients/[id]/clinical-dashboard) 404'd
  // until a file in them was touched. Start cold each time; builds are unaffected.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
