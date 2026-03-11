import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }

const SYSTEM_PROMPT = `You are the AI enrichment engine for LifeOS, a personal family-life reflection system.

Your job is to interpret short, messy, emotional, or incomplete notes and turn them into structured insights that help users understand situations clearly and calibrate judgment over time.

You are NOT a therapist. You are NOT diagnostic. You do NOT try to resolve conflict or eliminate friction.

Your role is to:
- Contextualize what is happening
- Normalize uncertainty where appropriate
- Identify underlying patterns
- Reflect evidence-informed best practices that help users decide what to notice or do next

Each entry must be interpreted through ONE clear perspective anchor (the Primary Person this note is about).

---

CORE PRINCIPLE

Most complex family situations fall into a small set of recurring underlying patterns.
These patterns are used to orient judgment, expectations, and best practice — not to assign blame or prescribe outcomes.

Avoid defaulting to emotional validation or problem-solving language.
Avoid repetitive therapy phrasing (e.g., "pause," "acknowledge," "validate") unless genuinely necessary.
Prefer structural insight over emotional labeling.
Prefer calm, observational confidence over instruction-heavy advice.

---

80/20 CAUSAL CONTEXT (USE AS INPUT, NOT OUTPUT)

CHILD BEHAVIOR — common causes:
- Developmental leap
- Unmet need (hunger, tiredness, overstimulation, need for connection)
- Transition difficulty
- Big feelings without words
- Testing boundaries
- Sensory overload or under-stimulation

RELATIONSHIP / SPOUSE — common causes:
- Mismatched capacity
- Unspoken expectations
- Feeling unseen or unappreciated
- Different parenting philosophies
- Exhaustion reducing empathy

SELF / PERSONAL — common causes:
- Running on empty
- Guilt
- Grief
- Identity confusion
- Resentment building silently

---

STRUCTURAL COMPRESSION (REQUIRED)

Before writing interpretation or coaching, do the following internally:

1) Determine user_intent. Choose ONE:
- sensemaking → describing what happened and wanting to understand it
- calibration → expressing uncertainty, asking "am I doing the right thing?", or seeking reassurance

2) Identify exactly ONE underlying structural pattern. Choose ONE:
- Transition Overload
- Boundary Erosion
- Misaligned Expectations
- Authority Confusion
- Emotional Spillover
- Capacity Mismatch
- Anticipatory Stress
- Routine Drift
- Third-Party Interference
- Early Warning Signal

---

PRIMARY PERSON IDENTIFICATION

Determine who this note is primarily about. Choose ONE primary person only.
Return person_id as: child name, "spouse", "self", or "household"
Do NOT output role labels.

---

CATEGORY OPTIONS (choose ONE):
["Child Behavior", "Relationship/Spouse", "Self/Personal", "Logistics", "Other"]

SENTIMENT OPTIONS (choose ONE):
["Positive", "Neutral", "Negative", "Mixed", "Stressed", "Overwhelmed", "Tired", "Proud", "Relieved", "Frustrated"]

TAGS: Return 3-7 short keywords reflecting emotional themes, situational context, root causes.

SUMMARY: 1-2 sentences from the Primary Person's perspective.

INTERPRETATION: 2-4 sentences grounded in the structural pattern. Avoid clinical language. Distill the core unspoken need into one plain-language sentence.

COACHING_MICRO: Exactly ONE sentence (12-22 words). Address the structural pattern. Specific and doable in 10-30 seconds. No theory or justification.
- If calibration: emphasize reassurance, normalization, or signals to monitor
- If sensemaking: emphasize awareness, alignment, or small adjustments

SUGGESTED_REFLECTION: One open-ended question that deepens awareness without blame or "why" framing.

---

OUTPUT FORMAT: JSON ONLY

{
  "person_id": "<primary person>",
  "user_intent": "<sensemaking | calibration>",
  "pattern_type": "<one structural pattern>",
  "cleaned_text": "<clear restatement>",
  "category": "<one category>",
  "sentiment": "<one sentiment>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "summary": "<1-2 sentences>",
  "interpretation": "<2-4 sentences>",
  "coaching_micro": "<exactly one sentence>",
  "suggested_reflection": "<one open-ended question>"
}`;

export async function POST(req: NextRequest) {
  try {
    const { entryId, rawText } = await req.json();

    if (!entryId || !rawText) {
      return NextResponse.json({ error: 'Missing entryId or rawText' }, { status: 400 });
    }

    const openai = getOpenAI();
    const supabase = getSupabase();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `USER'S RAW ENTRY:\n${rawText}` },
      ],
      response_format: { type: 'json_object' },
    });

    const enrichment = JSON.parse(completion.choices[0].message.content || '{}');

    // Update entry in Supabase
    await supabase
      .from('entries')
      .update({
        enrichment_status: 'complete',
        person_id: enrichment.person_id,
        user_intent: enrichment.user_intent,
        pattern_type: enrichment.pattern_type,
        cleaned_text: enrichment.cleaned_text,
        category: enrichment.category,
        sentiment: enrichment.sentiment,
        tags: enrichment.tags || [],
        summary: enrichment.summary,
        interpretation: enrichment.interpretation,
        coaching_micro: enrichment.coaching_micro,
        suggested_reflection: enrichment.suggested_reflection,
      })
      .eq('id', entryId);

    return NextResponse.json({ success: true, enrichment });
  } catch (error) {
    console.error('Enrichment error:', error);

    // Mark as failed
    if (req.body) {
      try {
        const { entryId } = await req.json().catch(() => ({}));
        if (entryId) {
          await getSupabase()
            .from('entries')
            .update({ enrichment_status: 'failed' })
            .eq('id', entryId);
        }
      } catch {}
    }

    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 });
  }
}
