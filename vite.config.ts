import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import manifestSRI from "vite-plugin-manifest-sri";
import path from "path";
import viteCompression from "vite-plugin-compression";
import ViteRestart from "vite-plugin-restart";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "" : "/dist/",
  assetsInclude: ["**/*.svg"],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    manifest: true,
    outDir: path.resolve(__dirname, "web/dist/"),
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, "src/ts/app.ts"),
      },
      output: {
        // Split three.js (core + TSL + examples/jsm addons: GLTFLoader,
        // DRACOLoader, etc.) into its own chunk
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
        },
      },
    },
    sourcemap: true,
  },
  plugins: [
    tailwindcss(),
    manifestSRI(),
    viteCompression({
      filter: /\.(js|mjs|json|css|map)$/i,
    }),
    ViteRestart({
      reload: ["templates/**/*", "src/ts/components/**/*"],
    }),
    viteStaticCopy({
      targets: [
        {
          src: "src/public/images/**/*",
          dest: "images",
        },
        {
          src: "src/public/fonts/**/*",
          dest: "fonts",
        },
      ],
      watch: {
        reloadPageOnChange: true,
      },
      hook: "buildStart",
    }),
  ],
  publicDir: path.resolve(__dirname, "src/public"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@css": path.resolve(__dirname, "src/css"),
      "@ts": path.resolve(__dirname, "src/ts"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // Running inside the ddev container over a bind mount: native inotify
    // misses host-side file-creation events, so new files aren't picked up
    // until a restart. Poll the filesystem instead.
    watch: {
      usePolling: true,
      interval: 300,
    },
    allowedHosts: [".ddev.site"],
    cors: {
      origin: /https?:\/\/([A-Za-z0-9\-.]+)?(\.ddev\.site)(?::\d+)?$/,
    },
  },
}));
