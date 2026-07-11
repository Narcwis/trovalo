import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function versionPlugin(): Plugin {
  return {
    name: "version-json",
    generateBundle() {
      const version =
        process.env.VITE_APP_VERSION || Date.now().toString(36);
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version }),
      });
    },
  };
}

export default defineConfig({
  base: "/trovalo/",
  plugins: [
    react(),
    versionPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        globIgnores: ["**/version.json"],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "Trovalo",
        short_name: "Trovalo",
        description: "Garage Inventory Manager",
        theme_color: "#4F46E5",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
        ],
      },
    }),
  ],
});
