'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, patternSignalsApi } from '@/lib/supabase';
import type { PatternSignal } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { getPatternEmoji, formatRelativeTime } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const signalLabels: Record<string, { label: string; description: string }> = {
  recurrence: {
    label: 'Recurring pattern',
    description: 'Same dynamic showing up repeatedly',
  },
  equity: {
    label: 'Attention balance',
    description: 'One child is taking up most of your log space this week',
  },
  relationship_drift: {
    label: 'Relationship signal',
    description: 'Some strain in your partner dynamic worth noticing',
  },
};

export default function PatternsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<PatternSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const data = await patternSignalsApi.list(user.id);
      setSignals(data);
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <div className="min-h-dvh bg-[#faf9f7] page-content">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-semibold text-stone-900">Patterns</h1>
        <p className="text-sm text-stone-400 mt-0.5">Things that keep showing up.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-amber-600" />
        </div>
      ) : signals.length === 0 ? (
        <div className="px-5 py-8">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
            <p className="text-2xl mb-3">🔁</p>
            <p className="text-stone-500 text-sm leading-relaxed">
              Patterns surface after a few weeks of logging. Keep going — the signal gets clearer over time.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-3">
          {signals.map((signal) => {
            const meta = signalLabels[signal.signal_type] || { label: signal.signal_type, description: '' };
            return (
              <div key={signal.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{getPatternEmoji(signal.pattern_type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{meta.label}</p>
                      <p className="text-[10px] text-stone-300">{formatRelativeTime(signal.last_detected_at)}</p>
                    </div>
                    <p className="text-stone-800 text-sm font-medium mt-1">
                      {signal.pattern_type}
                      {signal.child?.name ? ` · ${signal.child.name}` : ''}
                    </p>
                    <p className="text-stone-500 text-sm mt-1 leading-relaxed">{meta.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="h-1.5 flex-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, (signal.entry_count / 5) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-400">{signal.entry_count}× in {signal.window_days}d</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
