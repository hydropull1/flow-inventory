import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar, { LogoMark } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickClaim AI — Recover denied dental claims faster",
  description:
    "QuickClaim AI helps dental billing teams turn denied claim details, EOB notes, and clinical documentation into appeal-ready packets in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-slate-500">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <p className="font-semibold text-slate-800">
                QuickClaim <span className="text-blue-700">AI</span>
              </p>
            </div>
            <p className="mt-4 max-w-2xl leading-relaxed">
              QuickClaim AI is for billing workflow support only. It does not
              guarantee reimbursement, claim approval, or payer acceptance. Human
              review is required before submission. Demo data only.
            </p>
            <p className="mt-4 text-slate-400">
              © {new Date().getFullYear()} QuickClaim AI — Demo build.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
