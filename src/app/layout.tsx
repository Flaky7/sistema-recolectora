import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sistema Recolectora",
    template: "%s · Sistema Recolectora",
  },
  description:
    "Directorio de bazares y organización de pedidos: recibimos tus compras y te las enviamos juntas.",
  applicationName: "Sistema Recolectora",
  appleWebApp: {
    capable: true,
    title: "Recolectora",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  // Every user reads Spanish; on phones set to another language Chrome would otherwise offer to
  // translate the installed app on every launch.
  other: { google: "notranslate" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
