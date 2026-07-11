"use client";

import Link from "next/link";
import PageBackground from "@/components/PageBackground";

export default function CheckoutCancelPage() {
  return (
    <PageBackground overlayOpacity={0.85}>
      <div className="min-h-screen text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 text-center">
          {/* Cancel Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-900/30 border border-red-500 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3">Payment Cancelled</h1>
          <p className="text-slate-400 mb-8">
            Your payment was not processed. You can try again or explore other options.
          </p>

          {/* Reasons */}
          <div className="bg-slate-800/50 rounded-lg p-4 mb-8 text-left">
            <h3 className="font-semibold mb-3">Common reasons for cancellation:</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="text-orange-500">•</span>
                <span>You closed the payment window</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500">•</span>
                <span>Your card was declined</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500">•</span>
                <span>You chose not to complete the purchase</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500">•</span>
                <span>A technical error occurred</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/pricing" className="block">
              <button className="w-full bg-gradient-to-r from-cyan-500 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-orange-600 transition-all">
                Try Again
              </button>
            </Link>
            <Link href="/" className="block">
              <button className="w-full bg-slate-800 text-slate-100 py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all">
                Back to Home
              </button>
            </Link>
          </div>

          {/* Help */}
          <div className="mt-8 border-t border-slate-700 pt-6">
            <p className="text-sm text-slate-400 mb-4">Still need help?</p>
            <Link href="/contact" className="text-cyan-500 hover:underline font-semibold">
              Contact our support team →
            </Link>
          </div>
        </div>
      </div>
    </div>
    </PageBackground>
  );
}
