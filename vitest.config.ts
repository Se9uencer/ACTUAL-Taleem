import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Mirror the @/* → ./* path alias from tsconfig.json
      "@": path.resolve(__dirname, "."),
    },
  },
})
