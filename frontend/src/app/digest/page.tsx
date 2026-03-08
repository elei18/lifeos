'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, digestApi } from '@/lib/supabase';
import type { WeeklyDigest } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { formatFullDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const personEmoji: Record<string, string> = {
  child: '🧒', partner: '🤝', self: '🪞', household: '🏠',
};

export default function DigestPage() {
  const router = useRouter();
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const latest = await digestApi.getLatest(user.id);
      setDigest(latest);
      setLoading(false);
    }
    load();
  }, [router]);

  async function generateNow() {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch('/api/generate-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        const latest = await digestApi.getLatest(user.id);
        setDigest(latest);
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#faf9f7] page-content">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-semibold text-stone-900">Weekly Digest</h1>
        <p className="text-sm text-stone-400 mt-0.5">Your family, the past 7 days.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-amber-600" />
        </div>
      ) : !digest ? (
        <div className="px-5 py-8 flex flex-col gap-4">
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 text-center">
            <p className="text-2xl mb-3">🌅</p>
            <p className="text-stone-700 text-sm leading-relaxed">
              Your first digest generates automatically on Friday evening. Log a few notes first — the more context, the richer the digest.
            </p>
          </div>
          <button
            onClick={generateNow}
            disabled={generating}
            className="w-full py-4 bg-amber-700 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {generating ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : 'Generate now'}
          </button>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-4">
          {/* Week label */}
          <p className="text-xs text-stone-400">
            Week of {formatFullDate(digest.week_start_date)}
          </p>

          {/* Headline */}
          <div className="bg-amber-700 rounded-2xl p-5">
            <p className="text-amber-200 text-xs font-medium uppercase tracking-wide mb-1">This week</p>
            <p className="text-white text-base font-semibold leading-snug">{digest.content.headline}</p>
          </div>

          {/* Sections */}
          {digest.content.sections.map((section, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{personEmoji[section.person_type]}</span>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  {section.child_name || section.person_type}
                </p>
              </div>
              {section.observations.map((obs, j) => (
                <p key={j} className="text-stone-700 text-sm leading-relaxed mb-2">• {obs}</p>
              ))}
              {section.pattern_note && (
                <p className="text-stone-400 text-xs leading-relaxed mt-2 italic">{section.pattern_note}</p>
              )}
              <div className="mt-4 bg-stone-900 rounded-xl p-3">
                <p className="text-white text-xs font-medium leading-relaxed">{section.micro_action}</p>
              </div>
            </div>
          ))}

          {/* Equity note */}
          {digest.content.equity_note && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
              <p className="text-stone-700 text-sm leading-relaxed">💡 {digest.content.equity_note}</p>
            </div>
          )}

          {/* Reflection */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">A thought for next week</p>
            <p className="text-stone-600 text-sm leading-relaxed italic">{digest.content.reflection_prompt}</p>
          </div>

          {/* Generate new */}
          <button
            onClick={generateNow}
            disabled={generating}
            className="w-full py-3 border border-stone-200 text-stone-500 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : 'Regenerate digest'}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
