import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent entries
    const { data: entries } = await supabase
      .from('entries')
      .select('id, child_id, person_type, pattern_type, created_at')
      .eq('user_id', userId)
      .eq('enrichment_status', 'complete')
      .gte('created_at', fourteenDaysAgo);

    if (!entries || entries.length === 0) {
      return NextResponse.json({ signals: [] });
    }

    const signals: Array<{
      signal_type: string;
      child_id: string | null;
      pattern_type: string | null;
      entry_count: number;
      window_days: number;
      user_id: string;
      is_active: boolean;
    }> = [];

    // ---- RECURRENCE DETECTION ----
    // Same pattern_type for same child ≥ 3 times in 14 days
    const childPatternCounts: Record<string, Record<string, number>> = {};
    for (const entry of entries) {
      if (entry.person_type !== 'child' || !entry.child_id || !entry.pattern_type) continue;
      if (!childPatternCounts[entry.child_id]) childPatternCounts[entry.child_id] = {};
      const key = entry.pattern_type;
      childPatternCounts[entry.child_id][key] = (childPatternCounts[entry.child_id][key] || 0) + 1;
    }
    for (const [childId, patterns] of Object.entries(childPatternCounts)) {
      for (const [patternType, count] of Object.entries(patterns)) {
        if (count >= 3) {
          signals.push({
            user_id: userId,
            signal_type: 'recurrence',
            child_id: childId,
            pattern_type: patternType,
            entry_count: count,
            window_days: 14,
            is_active: true,
          });
        }
      }
    }

    // ---- EQUITY DETECTION ----
    // One child accounts for ≥75% of child entries in 7 days (when 2+ kids)
    const recentEntries = entries.filter(e => e.created_at >= sevenDaysAgo);
    const childEntryCounts: Record<string, number> = {};
    let totalChildEntries = 0;
    for (const entry of recentEntries) {
      if (entry.person_type !== 'child' || !entry.child_id) continue;
      childEntryCounts[entry.child_id] = (childEntryCounts[entry.child_id] || 0) + 1;
      totalChildEntries++;
    }
    const uniqueChildIds = Object.keys(childEntryCounts);
    if (uniqueChildIds.length >= 2 && totalChildEntries >= 3) {
      for (const [childId, count] of Object.entries(childEntryCounts)) {
        if (count / totalChildEntries >= 0.75) {
          signals.push({
            user_id: userId,
            signal_type: 'equity',
            child_id: childId,
            pattern_type: null,
            entry_count: count,
            window_days: 7,
            is_active: true,
          });
        }
      }
    }

    // ---- RELATIONSHIP DRIFT ----
    // ≥2 partner entries with Capacity Mismatch or Emotional Spillover in 7 days
    const partnerStressEntries = recentEntries.filter(
      e => e.person_type === 'partner' &&
        (e.pattern_type === 'Capacity Mismatch' || e.pattern_type === 'Emotional Spillover')
    );
    if (partnerStressEntries.length >= 2) {
      signals.push({
        user_id: userId,
        signal_type: 'relationship_drift',
        child_id: null,
        pattern_type: 'Capacity Mismatch',
        entry_count: partnerStressEntries.length,
        window_days: 7,
        is_active: true,
      });
    }

    // Upsert signals
    for (const signal of signals) {
      const { data: existing } = await supabase
        .from('pattern_signals')
        .select('id')
        .eq('user_id', userId)
        .eq('signal_type', signal.signal_type)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('pattern_signals')
          .update({ entry_count: signal.entry_count, last_detected_at: now.toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('pattern_signals').insert(signal);
      }
    }

    return NextResponse.json({ signals: signals.length });
  } catch (error) {
    console.error('Pattern detection error:', error);
    return NextResponse.json({ error: 'Pattern detection failed' }, { status: 500 });
  }
}
