'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { entriesApi } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { getSentimentColor, getPatternEmoji, formatRelativeTime } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await entriesApi.get(id);
      setEntry(data);
      setLoading(false);

      // Poll if enrichment is still pending
      if (data?.enrichment_status === 'pending') {
        setPolling(true);
      }
    }
    load();
  }, [id]);

  // Poll for enrichment completion
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const data = await entriesApi.get(id);
      setEntry(data);
      if (data?.enrichment_status !== 'pending') {
        setPolling(false);
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling, id]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#faf9f7]">
        <Loader2 size={24} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#faf9f7]">
        <p className="text-stone-400">Entry not found.</p>
      </div>
    );
  }

  const isPending = entry.enrichment_status === 'pending';

  return (
    <div className="min-h-dvh bg-[#faf9f7] page-content">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-stone-400 p-1">
          <ArrowLeft size={22} />
        </button>
        <div>
          <p className="text-xs text-stone-400">{formatRelativeTime(entry.created_at)}</p>
          {entry.sentiment && (
            <p className={`text-xs font-medium ${getSentimentColor(entry.sentiment)}`}>
              {entry.sentiment}
            </p>
          )}
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {/* Raw note */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Your note</p>
          <p className="text-stone-800 text-base leading-relaxed">{entry.raw_text}</p>
        </div>

        {/* Enrichment pending */}
        {isPending && (
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-amber-600 shrink-0" />
            <p className="text-amber-800 text-sm">Making sense of this…</p>
          </div>
        )}

        {/* Enrichment complete */}
        {entry.enrichment_status === 'complete' && (
          <>
            {/* Pattern + summary */}
            {entry.summary && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{getPatternEmoji(entry.pattern_type)}</span>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                    {entry.pattern_type || 'Pattern'}
                  </p>
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">{entry.summary}</p>
              </div>
            )}

            {/* Interpretation */}
            {entry.interpretation && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-2">
                  What&apos;s likely going on
                </p>
                <p className="text-stone-700 text-sm leading-relaxed">{entry.interpretation}</p>
              </div>
            )}

            {/* Coaching micro */}
            {entry.coaching_micro && (
              <div className="bg-stone-900 rounded-2xl p-5">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                  Worth trying next time
                </p>
                <p className="text-white text-sm leading-relaxed font-medium">{entry.coaching_micro}</p>
              </div>
            )}

            {/* Reflection */}
            {entry.suggested_reflection && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                  A thought to sit with
                </p>
                <p className="text-stone-600 text-sm leading-relaxed italic">{entry.suggested_reflection}</p>
              </div>
            )}

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {entry.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-stone-100 text-stone-500 rounded-full px-3 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Failed */}
        {entry.enrichment_status === 'failed' && (
          <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
            <p className="text-rose-700 text-sm">Couldn&apos;t interpret this one — the note was saved though.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
