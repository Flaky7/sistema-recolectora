import type { MetadataRoute } from "next";

// Installable PWA (FR-052, research R14). No offline service worker in phase 1.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sistema Recolectora",
    short_name: "Recolectora",
    description:
      "Directorio de bazares y organización de pedidos consolidados.",
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
