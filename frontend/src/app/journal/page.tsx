'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, entriesApi, childrenApi } from '@/lib/supabase';
import type { Entry, Child, PersonType } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { getSentimentColor, getPatternEmoji, getPersonTypeEmoji } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | PersonType>('all');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const [allEntries, kids] = await Promise.all([
        entriesApi.list(user.id, { limit: 50 }),
        childrenApi.list(user.id),
      ]);
      setEntries(allEntries);
      setChildren(kids);
      setLoading(false);
    }
    load();
  }, [router]);

  const filterOptions = [
    { value: 'all', label: 'All', emoji: '📋' },
    ...children.map(c => ({ value: c.id, label: c.name, emoji: '🧒' })),
    { value: 'partner', label: 'Partner', emoji: '🤝' },
    { value: 'self', label: 'Me', emoji: '🪞' },
  ];

  const filtered = filter === 'all'
    ? entries
    : entries.filter(e =>
        filter === 'partner' ? e.person_type === 'partner'
        : filter === 'self' ? e.person_type === 'self'
        : e.child_id === filter
      );

  // Group by date
  const grouped: Record<string, Entry[]> = {};
  for (const entry of filtered) {
    const date = new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  }

  return (
    <div className="min-h-dvh bg-[#faf9f7] page-content">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-semibold text-stone-900">Journal</h1>
        <p className="text-sm text-stone-400 mt-0.5">Everything you&apos;ve logged.</p>
      </div>

      {/* Filter tabs */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value as typeof filter)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border',
                filter === opt.value
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-white text-stone-600 border-stone-200'
              )}
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-amber-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-stone-400 text-sm">Nothing logged yet.</p>
          <button onClick={() => router.push('/log')} className="mt-3 text-amber-700 text-sm font-medium">
            Log something →
          </button>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-6">
          {Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date}>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">{date}</p>
              <div className="flex flex-col gap-2">
                {dayEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => router.push(`/entry/${entry.id}`)}
                    className="bg-white rounded-2xl border border-stone-200 p-4 text-left w-full"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{getPersonTypeEmoji(entry.person_type)}</span>
                          {entry.child?.name && (
                            <span className="text-xs font-medium text-stone-500">{entry.child.name}</span>
                          )}
                          {entry.enrichment_status === 'pending' && (
                            <Loader2 size={12} className="animate-spin text-amber-500" />
                          )}
                        </div>
                        <p className="text-stone-700 text-sm leading-snug line-clamp-2">
                          {entry.cleaned_text || entry.raw_text}
                        </p>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[10px] bg-stone-100 text-stone-400 rounded-full px-2 py-0.5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {entry.pattern_type && (
                          <span className="text-lg">{getPatternEmoji(entry.pattern_type)}</span>
                        )}
                        {entry.sentiment && (
                          <span className={`text-[10px] font-medium ${getSentimentColor(entry.sentiment)}`}>
                            {entry.sentiment}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
