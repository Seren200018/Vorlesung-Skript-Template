import { defineConfig } from "vite";

const manualChunks = (id) => {
  if (!id.includes("node_modules")) return;
  if (id.includes("mathjs")) return "mathjs";
  if (id.includes("jsxgraph")) return "jsxgraph";
  if (id.includes("roughjs")) return "roughjs";
  if (id.includes("plotly")) return "plotly";
  return "vendor";
};

export default defineConfig({
  base: "/Template/",
  build: {
    outDir: "dist-template",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
