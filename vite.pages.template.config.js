import { defineConfig } from "vite";

export default defineConfig({
  base: "/Template/",
  build: {
    outDir: "dist-template",
    emptyOutDir: true,
  },
});
