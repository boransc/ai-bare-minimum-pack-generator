import { defineConfig } from "vitest/config";

// No React plugin or jsdom: everything under test here is pure domain logic.
// Add @vitejs/plugin-react and environment: "jsdom" when component tests arrive.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
