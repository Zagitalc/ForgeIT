import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react"
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname)
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environmentMatchGlobs: [["tests/unit/**/*.test.tsx", "jsdom"]],
    setupFiles: ["tests/setup-ui.ts"],
    coverage: {
      reporter: ["text", "html"],
      thresholds: {
        lines: 59,
        statements: 59,
        functions: 54,
        branches: 72
      }
    }
  }
});
