import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";
import { Header } from "./components/header";
import { Footer } from "./components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BESS-BID | Solar Battery Export Tariff Auction Portal",
  description:
    "Official auction management system for battery energy storage export tariffs.",
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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans transition-colors duration-200">
        {/* 🔒 AuthProvider wraps Header, children, and Footer so they all share auth state */}
        <AuthProvider>
          <Header />

          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
            {children}
          </main>

          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
