'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // After signup, sign in immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/onboarding');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/log');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/log` },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-dvh bg-[#faf9f7] flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-xs">
          <p className="text-3xl mb-4">📬</p>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Check your email</h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            We sent a link to <strong>{email}</strong>. Click it to sign in — no password needed.
          </p>
          <button
            onClick={() => setMagicSent(false)}
            className="mt-6 text-amber-700 text-sm font-medium"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#faf9f7] flex flex-col justify-center px-6">
      <div className="max-w-xs mx-auto w-full">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-amber-100 text-2xl font-bold">L</span>
          </div>
          <h1 className="text-xl font-semibold text-stone-900">LifeOS</h1>
          <p className="text-stone-400 text-sm mt-1">A calm layer for family life.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setMode('signin'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'signin' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'signup' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 placeholder:text-stone-300 bg-white focus:outline-none focus:border-amber-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 placeholder:text-stone-300 bg-white focus:outline-none focus:border-amber-400"
          />

          {error && (
            <p className="text-rose-500 text-xs px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-700 text-white rounded-xl py-3.5 text-base font-semibold disabled:opacity-50 mt-1"
          >
            {loading ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Magic link divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400">or</span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        <button
          onClick={handleMagicLink}
          disabled={loading}
          className="w-full border border-stone-200 bg-white text-stone-600 rounded-xl py-3.5 text-sm font-medium disabled:opacity-50"
        >
          Send magic link
        </button>

        {mode === 'signup' && (
          <p className="text-xs text-stone-400 text-center mt-4 leading-relaxed">
            You'll need to enable Email auth in Supabase → Authentication → Providers.
          </p>
        )}
      </div>
    </div>
  );
}
