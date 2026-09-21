```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react],

  // GitHub Pages repository path
  base: "/b2b-rfq-marketplace/",

  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    emptyOutDir: true
  },

  server: {
    host: "localhost",
    port: 5173,
    strictPort: true
  },

  preview: {
    host: "localhost",
    port: 4173,
    strictPort: true
  }
});
```
