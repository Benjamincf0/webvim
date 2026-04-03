// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: "./src/content.ts",
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
