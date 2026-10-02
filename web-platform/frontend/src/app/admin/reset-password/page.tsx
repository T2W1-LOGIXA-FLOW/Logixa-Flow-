'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ephrnmigiwjhdjksreos.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_5d66_MvgxdoU06X3l_d5Pw_upXMW2Ml';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get('access_token') || '';
    setAccessToken(token);
    setReady(Boolean(token));
    if (token) window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!accessToken) return setError('The reset link is missing or expired.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data?.msg === 'string' ? data.msg : 'Password update failed');
      setMessage('Password updated. Redirecting to admin login...');
      setTimeout(() => router.push('/admin/login'), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-slate-900/60 border border-cyan-500/20 rounded-lg shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 px-8 py-8 rounded-t-lg border-b border-cyan-500/20">
          <h1 className="text-white text-2xl font-bold">Set Admin Password</h1>
          <p className="text-cyan-300 text-sm mt-2">Choose a new password for your admin account</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          {message && <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-4 text-emerald-300 text-sm">{message}</div>}
          {error && <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">{error}</div>}
          {!ready && <div className="text-slate-400 text-sm">Open the password reset link from your email to continue.</div>}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">New password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required disabled={!ready} className="w-full px-4 py-2 border border-slate-600/40 rounded-lg bg-slate-900/40 text-white outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirm password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required disabled={!ready} className="w-full px-4 py-2 border border-slate-600/40 rounded-lg bg-slate-900/40 text-white outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50" />
          </div>
          <button type="submit" disabled={loading || !ready} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Updating...' : 'Update password'}
          </button>
          <Link href="/admin/login" className="block text-center text-sm text-cyan-400 hover:text-cyan-300">Back to admin login</Link>
        </form>
      </div>
    </div>
  );
}
