// vite.config.ts
export default {
  build: {
    rollupOptions: {
      input: "./src/content.ts",
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
};
