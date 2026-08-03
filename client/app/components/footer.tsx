import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-background border-t border-border font-sans text-xs text-muted-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>© {new Date().getFullYear()} BESS-BID. All Rights Reserved.</p>
        <div className="flex space-x-6">
          <Link
            href="/privacy"
            className="hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link
            href="/contact"
            className="hover:text-primary transition-colors"
          >
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
};
