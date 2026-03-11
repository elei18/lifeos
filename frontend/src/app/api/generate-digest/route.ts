import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAI();
    const supabase = getSupabase();
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch entries from the past 7 days
    const { data: entries } = await supabase
      .from('entries')
      .select('*, child:children(name)')
      .eq('user_id', userId)
      .eq('enrichment_status', 'complete')
      .gte('created_at', weekStart.toISOString())
      .order('created_at', { ascending: false });

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'No entries this week' }, { status: 400 });
    }

    // Fetch active pattern signals
    const { data: signals } = await supabase
      .from('pattern_signals')
      .select('*, child:children(name)')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Fetch profile for partner name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('partner_name')
      .eq('user_id', userId)
      .single();

    const entrySummary = entries.map(e => ({
      person: e.child?.name || e.person_type,
      summary: e.summary,
      pattern: e.pattern_type,
      sentiment: e.sentiment,
      coaching: e.coaching_micro,
    }));

    const prompt = `You are generating the weekly LifeOS digest for a parent.

Context:
- Partner name: ${profile?.partner_name || 'partner'}
- Entries this week: ${JSON.stringify(entrySummary, null, 2)}
- Active pattern signals: ${JSON.stringify(signals?.map(s => ({ type: s.signal_type, child: s.child?.name, pattern: s.pattern_type, count: s.entry_count })), null, 2)}

Generate a warm, evidence-informed weekly digest. Tone: calm, human, non-clinical, non-preachy.

Rules:
- Include BOTH positive/interesting observations AND challenging moments — not just problems
- Maximum 3 sections (one per person/domain that had notable activity)
- Each section: 2-3 short observations, one optional pattern note, one warm micro-action
- equity_note: if one child dominated entries, gently note it (null if not applicable)
- reflection_prompt: one open-ended question for the week ahead
- headline: 1 warm sentence summarizing the week's feel

OUTPUT FORMAT — JSON ONLY:
{
  "headline": "string",
  "sections": [
    {
      "child_name": "string or null",
      "person_type": "child | partner | self | household",
      "observations": ["string", "string"],
      "pattern_note": "string or null",
      "micro_action": "string"
    }
  ],
  "equity_note": "string or null",
  "reflection_prompt": "string"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = JSON.parse(completion.choices[0].message.content || '{}');

    // Store digest
    const { data: digest } = await supabase
      .from('weekly_digests')
      .insert({
        user_id: userId,
        week_start_date: weekStart.toISOString().split('T')[0],
        week_end_date: now.toISOString().split('T')[0],
        content,
      })
      .select()
      .single();

    return NextResponse.json({ digestId: digest?.id, content });
  } catch (error) {
    console.error('Digest generation error:', error);
    return NextResponse.json({ error: 'Digest generation failed' }, { status: 500 });
  }
}
