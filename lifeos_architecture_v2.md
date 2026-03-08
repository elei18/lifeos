# LifeOS — Architecture & Technical Spec
Version: 2.0
Status: Active
Owner: Founder

---

## 1. Product Scope (MVP)

**Who:** One parent (solo logger), 1–2 kids aged 0–5, optional partner tracking.

**Core loop:** Parent logs a note (text or voice) → AI interprets it immediately → weekly digest synthesizes the week → delivered in-app and by email.

**What it covers (MVP):**
- Children (0–5): behavior, patterns, equity across multiple kids
- Partner/spouse: load imbalance, relationship drift (user awareness only — no shared views)
- Self: burnout signals, identity, capacity

**Out of scope (MVP):**
- Aging parents / elder care
- Milestones or health tracking
- Calendar / scheduling integrations
- Partner sharing or coordination features

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Mobile-first, PWA-ready |
| Database | Supabase (PostgreSQL) | Auth + RLS + real-time |
| AI — enrichment | OpenAI GPT-4o | Per-entry interpretation (prompt v1.4) |
| AI — voice | OpenAI Whisper API | Audio → transcript → enrichment |
| AI — digest | OpenAI GPT-4o | Weekly synthesis |
| Styling | Tailwind CSS | Mobile-first layouts |
| Language | TypeScript | Strict mode |
| Scheduled jobs | Vercel Cron Jobs | Weekly digest generation |
| Email delivery | Resend | Digest email + transactional |
| Storage | Supabase Storage | Voice note audio files |

**Color theme:** Warm amber/sand palette (calm, not clinical)

**Environment variables:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
CRON_SECRET=
```

---

## 3. Architecture Overview

```
User (mobile browser)
  │
  ├── Text note or Voice note
  │
  ▼
Next.js Frontend (mobile-first)
  │
  ├── /api/transcribe         ← audio → Whisper → transcript
  ├── /api/enrich-entry       ← text → GPT-4o (v1.4 prompt) → structured JSON
  ├── /api/detect-patterns    ← query DB → rule-based pattern signals
  ├── /api/generate-digest    ← triggered by Vercel Cron → GPT-4o → store + email
  └── /api/cron/weekly-digest ← Vercel Cron (Friday 8pm)
  │
  ▼
Supabase PostgreSQL
  ├── entries (with enrichment fields)
  ├── children
  ├── pattern_signals
  ├── weekly_digests
  └── user_profiles
  │
  ▼
Resend → Email delivery (weekly digest)
Supabase Storage → Voice note audio files
```

**Data flow per log entry:**
1. User types note or records voice
2. If voice → POST /api/transcribe → Whisper → transcript returned
3. Text (typed or transcribed) → POST /api/enrich-entry → GPT-4o → structured JSON
4. Entry + enrichment saved to Supabase
5. /api/detect-patterns runs → updates pattern_signals if thresholds met
6. UI shows immediate insight card

**Data flow for weekly digest:**
1. Vercel Cron fires Friday evening
2. /api/cron/weekly-digest → query entries from past 7 days + active pattern_signals
3. GPT-4o generates digest (positive + challenging observations, patterns, micro-actions)
4. Digest stored in weekly_digests table
5. Resend sends email to user
6. In-app digest page shows latest

---

## 4. Data Model

### users
Handled by Supabase Auth. No custom table needed.

### user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  partner_name TEXT,
  digest_day INTEGER DEFAULT 5,        -- 0=Sun, 5=Fri
  digest_time TEXT DEFAULT '20:00',    -- HH:MM local time
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### children
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  date_of_birth DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### entries
```sql
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  child_id UUID REFERENCES children,          -- null if about partner/self
  person_type TEXT NOT NULL,                  -- 'child' | 'partner' | 'self' | 'household'
  raw_text TEXT NOT NULL,
  voice_note_url TEXT,                        -- Supabase Storage URL

  -- AI enrichment (from prompt v1.4)
  enrichment_status TEXT DEFAULT 'pending',  -- 'pending' | 'complete' | 'failed'
  person_id TEXT,                             -- identifier from prompt
  user_intent TEXT,                           -- 'sensemaking' | 'calibration'
  pattern_type TEXT,                          -- structural pattern from fixed taxonomy
  cleaned_text TEXT,
  category TEXT,
  sentiment TEXT,
  tags TEXT[],
  summary TEXT,
  interpretation TEXT,
  coaching_micro TEXT,
  suggested_reflection TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pattern_signals
```sql
CREATE TABLE pattern_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  signal_type TEXT NOT NULL,   -- 'recurrence' | 'equity' | 'intensity_cluster' | 'relationship_drift'
  child_id UUID REFERENCES children,
  pattern_type TEXT,            -- which structural pattern is recurring
  entry_count INTEGER,
  window_days INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### weekly_digests
```sql
CREATE TABLE weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  content JSONB NOT NULL,       -- full digest structure (see below)
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Digest content schema (JSONB):**
```json
{
  "headline": "string",
  "sections": [
    {
      "child_name": "string | null",
      "person_type": "child | partner | self",
      "observations": ["string"],
      "pattern_note": "string | null",
      "micro_action": "string"
    }
  ],
  "equity_note": "string | null",
  "reflection_prompt": "string"
}
```

---

## 5. API Routes

| Route | Method | Purpose |
|---|---|---|
| /api/transcribe | POST | Audio file → Whisper → transcript |
| /api/enrich-entry | POST | Raw text → GPT-4o (v1.4) → enrichment JSON |
| /api/detect-patterns | POST | Check DB → update pattern_signals |
| /api/generate-digest | POST | Build + store weekly digest for a user |
| /api/send-digest-email | POST | Send digest via Resend |
| /api/cron/weekly-digest | GET | Vercel Cron trigger (secured by CRON_SECRET) |

---

## 6. Pattern Detection (Rule-Based)

Runs after each entry save. Deterministic — no AI needed.

**Recurrence signal:**
- Trigger: same `pattern_type` appears ≥ 3 times for same child in 14 days
- Creates: pattern_signal with type = 'recurrence'

**Equity signal:**
- Trigger: one child accounts for ≥ 75% of entries in 7 days (when user has 2+ kids)
- Creates: pattern_signal with type = 'equity'

**Relationship drift signal:**
- Trigger: ≥ 2 entries with person_type = 'partner' and pattern_type in ['Capacity Mismatch', 'Emotional Spillover'] in 7 days
- Creates: pattern_signal with type = 'relationship_drift'

---

## 7. Voice Input Flow

1. User taps mic button on mobile
2. Browser MediaRecorder API captures audio (webm/mp4)
3. On stop → blob sent to /api/transcribe (multipart form)
4. Server calls OpenAI Whisper API
5. Transcript returned to client
6. Client shows transcript for quick review/edit
7. User confirms → entry saved with both raw_text and voice_note_url
8. Enrichment runs on the transcript

---

## 8. Mobile-First Principles

- All layouts designed for 375px width first, scaled up
- Bottom navigation (thumb zone) for primary actions
- Log button always accessible (floating or pinned bottom)
- Voice input prominent on home screen
- Digest readable as a "story" — no dense tables or charts
- No required scrolling to submit a log
- PWA manifest for home screen install (add to home screen prompt)

---

## 9. Screens

| Screen | Purpose |
|---|---|
| Onboarding | 2-min setup: kids' names + DOBs, partner name optional |
| Home / Log | Primary input: text or voice, who is this about |
| Entry insight | Immediate interpretation card after logging |
| Journal | Chronological list of entries, filterable by child |
| Patterns | Active pattern signals surfaced visually |
| Digest | In-app weekly digest view |
| Settings | Preferences, digest day/time, email settings |

---

## 10. AI Prompt References

- **Per-entry enrichment:** Prompt v1.4 (see Prompt versions.docx) — produces structured JSON with person_id, user_intent, pattern_type, summary, interpretation, coaching_micro, suggested_reflection
- **Weekly digest:** New prompt to be written — takes last 7 days of entries + active signals → produces digest content JSON
- **Tone:** Per Tone & Language Playbook v0.1 — warm, evidence-informed, non-clinical, Triple-Layer structure (normalize → interpret → micro-action)

---

## 11. 6-Week Build Plan

**Week 1**
- Supabase schema + RLS setup
- Auth (Supabase magic link)
- Onboarding flow (kids + partner setup)

**Week 2**
- Home/log screen (text input, who is this about)
- /api/enrich-entry (prompt v1.4)
- Entry insight card (immediate output display)

**Week 3**
- Voice input (MediaRecorder + Whisper)
- Journal screen (entry history, per-child filter)
- Pattern detection logic + pattern_signals

**Week 4**
- Weekly digest prompt + /api/generate-digest
- Digest in-app screen
- Resend email setup + digest email template

**Week 5**
- Vercel Cron for automated weekly digest
- Patterns screen
- Mobile polish + PWA manifest

**Week 6**
- End-to-end QA on mobile
- Recruit 5–10 test parents
- Soft launch

---

## 12. What This Is Not

- Not a task manager or calendar
- Not a milestone tracker
- Not a health or diagnostic tool
- Not a therapy replacement
- Not a coordination app between partners
- Not a chat interface (input is notes, not conversation)

---

End of Document
