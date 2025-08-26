// src/app/not-found.tsx
"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="glass rounded-3xl p-8 mb-8 animate-scaleIn">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-blue-600 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">404</span>
          </div>
          
          <h1 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
            Page Not Found
          </h1>
          
          <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[var(--accent-blue)] to-blue-600 text-white font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl glass hover:glass-heavy font-medium hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
        
        <p className="text-xs text-[var(--text-tertiary)]">
          Need help? Contact support or visit our documentation.
        </p>
      </div>
    </div>
  );
}