import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    // Cada arquivo de banco aplica todas as migrations no Postgres embutido.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
