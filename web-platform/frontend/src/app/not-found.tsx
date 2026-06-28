import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Logixa Flow",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-2">
          <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
            404
          </h1>
          <p className="text-2xl md:text-4xl font-bold text-slate-200">
            Oops! Page Not Found
          </p>
        </div>

        <p className="text-slate-400 text-lg">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved. Don&apos;t worry, you can find plenty of other things on our homepage.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-orange-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-orange-600 transition-all"
          >
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-slate-800 text-slate-100 font-semibold rounded-lg border border-slate-600 hover:bg-slate-700 transition-all"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-400 text-sm mb-4">Need help? Contact us:</p>
          <Link
            href="/contact"
            className="text-cyan-500 hover:text-cyan-400 font-semibold transition-colors"
          >
            Get in Touch →
          </Link>
        </div>
      </div>

      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
