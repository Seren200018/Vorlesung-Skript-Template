import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.js",
      name: "AvcScriptTemplate",
      fileName: (format) => `avc-script-template.${format}.js`,
      formats: ["es", "umd"],
    },
    rollupOptions: {
      output: {
        globals: {},
        exports: "named",
      },
    },
  },
});
