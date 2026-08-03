"use client";

import React, { useState } from "react";
import Link from "next/link";

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 font-sans">
      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        {/* Brand Logo & Identifier */}
        <Link href="/" className="flex items-center space-x-3">
          <div
            className="w-10 h-10 text-white font-black rounded-lg flex items-center justify-center text-xl shadow-sm"
            style={{ backgroundColor: "#7a0026" }}
          >
            BB
          </div>
          <div>
            <h1
              className="text-lg font-bold tracking-tight leading-none"
              style={{ color: "#7a0026" }}
            >
              BESS-BID
            </h1>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-1">
              Distribution Licensee Tariff Platform
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 text-sm font-semibold text-slate-700">
          <Link
            href="/"
            className="px-3.5 py-2 rounded-md hover:bg-slate-50 hover:text-[#7a0026] transition"
          >
            Home
          </Link>
          <Link
            href="/auctions"
            className="px-3.5 py-2 rounded-md hover:bg-slate-50 hover:text-[#7a0026] transition"
          >
            Auction Schedule
          </Link>
          <Link
            href="/schemes"
            className="px-3.5 py-2 rounded-md hover:bg-slate-50 hover:text-[#7a0026] transition"
          >
            Tariff Schemes
          </Link>
          <Link
            href="/certifications"
            className="px-3.5 py-2 rounded-md hover:bg-slate-50 hover:text-[#7a0026] transition"
          >
            Certifications
          </Link>
        </nav>

        {/* Portal Login & Register CTA Buttons */}
        <div className="hidden sm:flex items-center space-x-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            Portal Login
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold text-white rounded-md transition shadow-sm hover:opacity-95"
            style={{ backgroundColor: "#7a0026" }}
          >
            Register Bidder
          </Link>
        </div>

        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-2">
          <Link
            href="/"
            className="block px-3 py-2 rounded-md font-medium text-slate-800 hover:bg-slate-50"
          >
            Home
          </Link>
          <Link
            href="/auctions"
            className="block px-3 py-2 rounded-md font-medium text-slate-800 hover:bg-slate-50"
          >
            Auction Schedule
          </Link>
          <Link
            href="/schemes"
            className="block px-3 py-2 rounded-md font-medium text-slate-800 hover:bg-slate-50"
          >
            Tariff Schemes
          </Link>
          <Link
            href="/certifications"
            className="block px-3 py-2 rounded-md font-medium text-slate-800 hover:bg-slate-50"
          >
            Certifications
          </Link>
          <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full text-center py-2 rounded border border-slate-300 font-semibold text-slate-800"
            >
              Portal Login
            </Link>
            <Link
              href="/register"
              className="w-full text-center py-2 rounded font-semibold text-white"
              style={{ backgroundColor: "#7a0026" }}
            >
              Register Bidder
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
