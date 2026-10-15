import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/national-excuse-office/",
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes("pdfjs-dist")) return "pdf-viewer";
          if (
            id.includes("@react-pdf") ||
            id.includes("fontkit") ||
            id.includes("yoga-layout")
          )
            return "pdf-engine";
        },
      },
    },
  },
});
