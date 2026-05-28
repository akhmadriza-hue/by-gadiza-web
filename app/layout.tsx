import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "./components/Navigation";
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
  title: "By Gadiza - Gelang Kerajinan Tangan",
  description: "Toko online gelang kerajinan tangan berkualitas dengan desain unik dan material premium",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f7f2eb] text-slate-900 flex flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xs text-slate-500">© 2026 By Gadiza. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/admin/orders" className="text-xs font-medium text-slate-400 transition hover:text-slate-700">
                Admin Area
              </Link>
              <Link href="/admin/products" className="text-xs font-medium text-slate-400 transition hover:text-slate-700">
                Admin Produk
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
