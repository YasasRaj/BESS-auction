// client/src/app/page.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-center items-center overflow-hidden bg-slate-950 text-white">
      {/* Background Image - Forced Cover */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat w-full h-full"
        style={{
          backgroundImage: "url('/splash-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
        }}
      >
        {/* Dark Gradient Overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-slate-950/40" />
      </div>

      {/* Hero Splash Content */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center flex flex-col items-center justify-center space-y-6">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          BESS-BID
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-light leading-relaxed">
          Distribution Licensee Tariff Platform
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
          {loading ? (
            /* Loading State */
            <div className="px-8 py-3.5 text-sm font-medium text-slate-400">
              Checking session...
            </div>
          ) : user ? (
            /* Logged In: Show Dashboard Button */
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5 text-center"
            >
              Go to Dashboard →
            </Link>
          ) : (
            /* Logged Out: Show Sign Up and Log In */
            <>
              <Link
                href="/register-bidder"
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5 text-center"
              >
                Sign Up
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg border border-slate-700/80 backdrop-blur-md transition text-center"
              >
                Log In
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
