import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "/",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    target: "es2022",
    cssTarget: "safari16",
    modulePreload: { polyfill: false },
    assetsInlineLimit: 2048,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // Keep the critical shell small: motion libs load as their own chunk.
        manualChunks(id) {
          if (id.includes("node_modules/gsap")) return "motion";
          if (id.includes("node_modules/lenis")) return "motion";
          return undefined;
        },
      },
    },
  },
});
