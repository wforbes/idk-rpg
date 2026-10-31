import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: {
    // Phaser and the QuickJS sandbox are large single dependencies.
    chunkSizeWarningLimit: 4000,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
