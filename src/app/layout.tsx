import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { RecoveryHashRedirect } from "@/components/auth/recovery-hash-redirect";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Dívidas", template: "%s · Dívidas" },
  description: "Controle o que você deve e o que te devem.",
  appleWebApp: { capable: true, title: "Dívidas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <RecoveryHashRedirect />
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
