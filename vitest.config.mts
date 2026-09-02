import { defineConfig } from "vitest/config";

// No React plugin or jsdom: everything under test here is pure domain logic.
// Add @vitejs/plugin-react and environment: "jsdom" when component tests arrive.
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
