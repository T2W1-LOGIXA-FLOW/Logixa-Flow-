// src/app/admin/login/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, validateAdminToken } from '@/components/api';
import { clearAdminSession, getAdminSessionToken, setAdminSession } from '@/lib/adminSession';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    async function checkExistingSession() {
      const token = getAdminSessionToken();
      if (!token) return;

      const valid = await validateAdminToken(token);
      if (cancelled) return;

      if (valid) {
        router.push('/admin');
      } else {
        clearAdminSession();
      }
    }

    checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await login(email.trim(), password);
      setAdminSession(data.access_token, data.refresh_token);
      if (rememberMe) {
        localStorage.setItem('adminEmail', email.trim());
      } else {
        localStorage.removeItem('adminEmail');
      }
      router.push('/admin');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      console.error('Login error:', err);
      setError(
        message === 'Invalid login credentials'
          ? 'Invalid email or password.'
          : message || 'Unable to sign in. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-slate-900/60 backdrop-blur border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-500/5 w-full max-w-md">
        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 backdrop-blur px-8 py-8 rounded-t-lg border-b border-cyan-500/20">
          <h1 className="text-white text-2xl font-bold">Admin Login</h1>
          <p className="text-cyan-300 text-sm mt-2">Logixa Flow Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          {error && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-4 backdrop-blur">
              <p className="text-red-300 text-sm font-medium">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full px-4 py-2 border border-slate-600/40 rounded-lg bg-slate-900/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2 border border-slate-600/40 rounded-lg bg-slate-900/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
            />
          </div>

          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-cyan-600 rounded focus:ring-2 focus:ring-cyan-500"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-300">
              Remember email for next time
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium py-2 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Login to Dashboard'}
          </button>

          <div className="text-center">
            <Link href="/admin/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300">
              Forgot password?
            </Link>
          </div>
        </form>

        <div className="bg-slate-900/30 backdrop-blur px-8 py-4 rounded-b-lg border-t border-slate-700/50">
          <p className="text-sm text-slate-400 text-center">
            Not an admin?{' '}
            <Link href="/" className="text-cyan-600 hover:text-cyan-700 font-medium">
              Return to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
