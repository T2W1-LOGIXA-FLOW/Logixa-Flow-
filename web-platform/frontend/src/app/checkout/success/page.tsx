"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import PageBackground from "@/components/PageBackground";

export default function CheckoutSuccessPage() {

  return (
    <PageBackground overlayOpacity={0.15}>
      <div className="min-h-screen text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-green-900/30 border border-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3">Payment Successful!</h1>
          <p className="text-slate-400 mb-8">
            Thank you for your purchase. Your subscription is now active.
          </p>

          {/* Confirmation Details */}
          <div className="bg-slate-800/50 rounded-lg p-4 mb-8 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Order ID:</span>
              <span className="font-semibold">#123456789</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-green-500 font-semibold">Confirmed</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Plan:</span>
              <span className="font-semibold">Pro Monthly</span>
            </div>
            <div className="border-t border-slate-700 pt-3 mt-3 flex justify-between">
              <span className="text-slate-400">Amount Paid:</span>
              <span className="text-xl font-bold">$29.00</span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-slate-800/20 border border-slate-700 rounded-lg p-4 mb-8 text-left">
            <h3 className="font-semibold mb-3">Next Steps:</h3>
            <ol className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="text-cyan-500">1.</span>
                <span>A confirmation email has been sent to your email address</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500">2.</span>
                <span>Your subscription will renew automatically on the same date each month</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500">3.</span>
                <span>You can manage your subscription in your account settings</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/dashboard" className="block">
              <button className="w-full bg-gradient-to-r from-cyan-500 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-orange-600 transition-all">
                Go to Dashboard
              </button>
            </Link>
            <Link href="/" className="block">
              <button className="w-full bg-slate-800 text-slate-100 py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all">
                Back to Home
              </button>
            </Link>
          </div>

          {/* Help */}
          <p className="text-xs text-slate-500 mt-8">
            Need help?{" "}
            <Link href="/contact" className="text-cyan-500 hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
    <Footer />
    </PageBackground>
  );
}
