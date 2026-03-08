'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, profileApi, childrenApi } from '@/lib/supabase';
import type { UserProfile, Child } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { getChildAge } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const [prof, kids] = await Promise.all([
        profileApi.get(user.id),
        childrenApi.list(user.id),
      ]);
      setProfile(prof);
      setChildren(kids);
      setEmail(user.email || '');
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await profileApi.upsert(user.id, {
        partner_name: profile.partner_name,
        digest_day: profile.digest_day,
        digest_time: profile.digest_time,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#faf9f7]">
        <Loader2 size={24} className="animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#faf9f7] page-content">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-semibold text-stone-900">Settings</h1>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {/* Account */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Account</p>
          <p className="text-sm text-stone-600">{email}</p>
        </div>

        {/* Family */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Your children</p>
          <div className="flex flex-col gap-2">
            {children.map((child) => (
              <div key={child.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-stone-800">{child.name}</p>
                  {child.date_of_birth && (
                    <p className="text-xs text-stone-400">{getChildAge(child.date_of_birth)} old</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="mt-3 text-xs text-amber-700 font-medium"
          >
            + Add or edit children
          </button>
        </div>

        {/* Partner */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Partner</p>
          <input
            type="text"
            value={profile?.partner_name || ''}
            onChange={(e) => setProfile(p => p ? { ...p, partner_name: e.target.value } : p)}
            placeholder="Partner's name (optional)"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Digest schedule */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Weekly digest</p>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-stone-500 mb-2">Day</p>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    onClick={() => setProfile(p => p ? { ...p, digest_day: i } : p)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      profile?.digest_day === i
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'bg-white text-stone-500 border-stone-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-2">Time</p>
              <input
                type="time"
                value={profile?.digest_time || '20:00'}
                onChange={(e) => setProfile(p => p ? { ...p, digest_time: e.target.value } : p)}
                className="border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-700 bg-stone-50 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-amber-700 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : saved ? '✓ Saved' : 'Save settings'}
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 text-stone-400 text-sm"
        >
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
