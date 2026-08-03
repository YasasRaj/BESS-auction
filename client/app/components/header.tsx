"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  return (
    <header className="w-full bg-background border-b border-border sticky top-0 z-50 font-sans">
      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        {/* Brand Logo & Identifier */}
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary text-primary-foreground font-black rounded-lg flex items-center justify-center text-xl shadow-sm">
            BB
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none text-primary">
              BESS-BID
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase mt-1">
              Distribution Licensee Tariff Platform
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 text-sm font-semibold text-foreground">
          <Link
            href="/"
            className="px-3.5 py-2 rounded-md hover:bg-accent hover:text-primary transition-colors"
          >
            Home
          </Link>
          <Link
            href="/auctions"
            className="px-3.5 py-2 rounded-md hover:bg-accent hover:text-primary transition-colors"
          >
            Auction Schedule
          </Link>
          <Link
            href="/schemes"
            className="px-3.5 py-2 rounded-md hover:bg-accent hover:text-primary transition-colors"
          >
            Tariff Schemes
          </Link>
          <Link
            href="/certifications"
            className="px-3.5 py-2 rounded-md hover:bg-accent hover:text-primary transition-colors"
          >
            Certifications
          </Link>
        </nav>

        {/* Desktop Dynamic Auth Action Buttons */}
        <div className="hidden sm:flex items-center space-x-3">
          {loading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-semibold text-foreground border border-border rounded-md hover:bg-accent transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-md transition-opacity shadow-sm hover:opacity-90 cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-foreground border border-border rounded-md hover:bg-accent transition-colors"
              >
                Portal Login
              </Link>
              <Link
                href="/register-bidder"
                className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md transition-opacity shadow-sm hover:opacity-90"
              >
                Register Bidder
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 rounded-md text-foreground hover:bg-accent cursor-pointer"
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
        <div className="lg:hidden bg-background border-t border-border px-4 pt-3 pb-6 space-y-2">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md font-medium text-foreground hover:bg-accent"
          >
            Home
          </Link>
          <Link
            href="/auctions"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md font-medium text-foreground hover:bg-accent"
          >
            Auction Schedule
          </Link>
          <Link
            href="/schemes"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md font-medium text-foreground hover:bg-accent"
          >
            Tariff Schemes
          </Link>
          <Link
            href="/certifications"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md font-medium text-foreground hover:bg-accent"
          >
            Certifications
          </Link>

          {/* Mobile Auth Actions */}
          <div className="pt-4 border-t border-border flex flex-col gap-2">
            {loading ? (
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded border border-border font-semibold text-foreground hover:bg-accent"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-center py-2 rounded font-semibold bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded border border-border font-semibold text-foreground hover:bg-accent"
                >
                  Portal Login
                </Link>
                <Link
                  href="/register-bidder"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Register Bidder
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
