import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 font-sans text-xs text-slate-500 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>© {new Date().getFullYear()} BESS-BID. All Rights Reserved.</p>
        <div className="flex space-x-6">
          <Link
            href="/privacy"
            className="hover:text-[#7a0026] transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="hover:text-[#7a0026] transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/contact"
            className="hover:text-[#7a0026] transition-colors"
          >
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
};
