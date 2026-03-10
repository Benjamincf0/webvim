// vite.config.js
export default {
  build: {
    rollupOptions: {
      input: {
        content: "./content.js",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
};
