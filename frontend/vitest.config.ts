import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Follow-up rules depend on the viewer's local date, so tests run in a fixed zone
// (India, UTC+5:30) whatever the machine or CI runner is set to.
process.env.TZ = "Asia/Kolkata";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
