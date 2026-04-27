import type { Metadata, Viewport } from "next";
import { Jost, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/pwa/register-sw";

const jost = Jost({
 variable: "--font-jost",
 subsets: ["latin"],
 weight: ["300", "400", "500", "600", "700"],
});

const dmSerifDisplay = DM_Serif_Display({
 variable: "--font-display",
 subsets: ["latin"],
 weight: ["400"],
 style: ["normal", "italic"],
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
 themeColor: "#443625",
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
  <html lang="it" className={`${jost.variable} ${dmSerifDisplay.variable} h-full`}>
   <body className="min-h-full antialiased">
    {children}
    <RegisterSW />
   </body>
  </html>
 );
}
