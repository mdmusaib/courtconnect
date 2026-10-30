import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CourtConnect — Book local turf in Melvisharam",
    template: "%s · CourtConnect",
  },
  description:
    "Book floodlit football, cricket, and badminton courts in Melvisharam and Vellore. Live availability, instant UPI confirmation, and offline match passes.",
  applicationName: "CourtConnect",
  manifest: "/manifest.json",
  keywords: [
    "turf booking",
    "Melvisharam",
    "Vellore",
    "football court",
    "cricket net",
    "badminton",
    "CourtConnect",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CourtConnect",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "CourtConnect — Book local turf",
    description:
      "Live court availability and instant UPI confirmation in Melvisharam & Vellore.",
    type: "website",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0F17",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-oled text-slate-50 antialiased`}
      >
        <ToastProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <AuthNotice />
            </Suspense>
            {children}
            <BottomNav />
            <ServiceWorkerRegister />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
