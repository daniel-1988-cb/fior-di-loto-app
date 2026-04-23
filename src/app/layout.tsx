import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/pwa/register-sw";

const inter = Inter({
 variable: "--font-inter",
 subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
 variable: "--font-cormorant",
 subsets: ["latin"],
 weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
 title: "Fior di Loto — Gestionale",
 description: "CRM e Gestionale per Fior di Loto Centro Estetico & Benessere",
 manifest: "/manifest.json",
 applicationName: "Fior di Loto",
 appleWebApp: {
  capable: true,
  statusBarStyle: "default",
  title: "Fior di Loto",
 },
 formatDetection: {
  telephone: false,
 },
};

export const viewport: Viewport = {
 themeColor: "#3D2817",
 width: "device-width",
 initialScale: 1,
 maximumScale: 5,
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
  <html lang="it" className={`${inter.variable} ${cormorant.variable} h-full`}>
   <body className="min-h-full antialiased">
    {children}
    <RegisterSW />
   </body>
  </html>
 );
}
