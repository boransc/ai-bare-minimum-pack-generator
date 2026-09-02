import { defineConfig } from "vitest/config";

// No React plugin or jsdom: everything under test here is pure domain logic.
// Add @vitejs/plugin-react and environment: "jsdom" when component tests arrive.
//
// Deliberately NOT loading .env.local here. Doing so makes the whole suite
// non-hermetic: lib/api/rate-limit takes the KV path when Cloudflare is
// configured, so the same test passes or fails depending on whether the
// developer happens to have credentials on disk, and CI disagrees with the
// laptop. The two live checks that genuinely need credentials pass them
// explicitly instead — see the tailoring-check and email-check scripts.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" resolves to a throwing stub unless the "react-server"
    // condition is set (Next sets it when building server code); without
    // this, any test that transitively imports lib/cloudflare/** — which is
    // marked server-only, correctly, since it holds real API credentials —
    // fails with "cannot be imported from a Client Component" even though
    // nothing here runs in a browser.
    conditions: ["react-server"],
  },
  ssr: {
    resolve: { conditions: ["react-server"] },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
