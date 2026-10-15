"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service (Sentry, etc.)
    console.error("Application error:", error);

    // You can send error to Sentry here
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-2">
          <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            500
          </h1>
          <p className="text-2xl md:text-4xl font-bold text-slate-200">
            Oops! Something went wrong
          </p>
        </div>

        <p className="text-slate-400 text-lg">
          We&apos;re sorry for the inconvenience. An unexpected error occurred. Our team has been notified and is working on a fix.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-red-400 break-words">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => reset()}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-orange-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-orange-600 transition-all"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-8 py-3 bg-slate-800 text-slate-100 font-semibold rounded-lg border border-slate-600 hover:bg-slate-700 transition-all"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-400 text-sm mb-4">Still need help?</p>
          <Link
            href="/contact"
            className="text-cyan-500 hover:text-cyan-400 font-semibold transition-colors"
          >
            Contact Support →
          </Link>
        </div>
      </div>

      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
