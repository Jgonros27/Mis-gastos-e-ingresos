import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync, cpSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
mkdirSync("public/pdf-assets", { recursive: true });
for (const directory of ["cmaps", "standard_fonts", "wasm", "iccs"])
  cpSync(
    "node_modules/pdfjs-dist/" + directory,
    "public/pdf-assets/" + directory,
    { recursive: true },
  );
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icon-192.png",
        "icon-512.png",
        "logo.svg",
        "notification.js",
      ],
      manifest: {
        name: "Brisa · Gastos e ingresos",
        short_name: "Brisa",
        id: "./",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#faf9f5",
        theme_color: "#f3cc46",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 8000000,
        globPatterns: ["**/*.{js,mjs,css,html,png,svg,bcmap,ttf,pfb,wasm,icc}"],
        importScripts: ["notification.js"],
      },
    }),
  ],
  define: {
    __PASSWORD_HASH__: JSON.stringify(
      createHash("sha256")
        .update(readFileSync("CONTRASENA.txt", "utf8").split(/\r?\n/)[0].trim())
        .digest("hex"),
    ),
  },
});
