'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/admin/reset-password',
      });
      if (error) throw error;
      setMessage('If this email belongs to an admin account, a password reset email has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-slate-900/60 border border-cyan-500/20 rounded-lg shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 px-8 py-8 rounded-t-lg border-b border-cyan-500/20">
          <h1 className="text-white text-2xl font-bold">Reset Admin Password</h1>
          <p className="text-cyan-300 text-sm mt-2">Send a secure password reset link</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          {message && <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-4 text-emerald-300 text-sm">{message}</div>}
          {error && <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">{error}</div>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Admin email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className="w-full px-4 py-2 border border-slate-600/40 rounded-lg bg-slate-900/40 text-white outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
          <Link href="/admin/login" className="block text-center text-sm text-cyan-400 hover:text-cyan-300">Back to admin login</Link>
        </form>
      </div>
    </div>
  );
}
