-- LifeOS Supabase Schema
-- Run this in the Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER PROFILES
-- =============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  partner_name TEXT,
  digest_day INTEGER DEFAULT 5,         -- 0=Sun, 1=Mon ... 5=Fri, 6=Sat
  digest_time TEXT DEFAULT '20:00',     -- HH:MM in user's local time
  timezone TEXT DEFAULT 'America/New_York',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- CHILDREN
-- =============================================
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  birth_season TEXT,            -- 'Spring' | 'Summer' | 'Fall' | 'Winter'
  birth_year INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own children"
  ON children FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ENTRIES (core log)
-- =============================================
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  child_id UUID REFERENCES children,              -- null if about partner/self
  person_type TEXT NOT NULL DEFAULT 'child',      -- 'child' | 'partner' | 'self' | 'household'
  raw_text TEXT NOT NULL,
  voice_note_url TEXT,                            -- Supabase Storage URL

  -- AI enrichment (from prompt v1.4)
  enrichment_status TEXT DEFAULT 'pending',       -- 'pending' | 'complete' | 'failed'
  person_id TEXT,
  user_intent TEXT,                               -- 'sensemaking' | 'calibration'
  pattern_type TEXT,                              -- structural pattern from fixed taxonomy
  cleaned_text TEXT,
  category TEXT,
  sentiment TEXT,
  tags TEXT[] DEFAULT '{}',
  summary TEXT,
  interpretation TEXT,
  coaching_micro TEXT,
  suggested_reflection TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX entries_user_id_created_at ON entries (user_id, created_at DESC);
CREATE INDEX entries_child_id ON entries (child_id);
CREATE INDEX entries_person_type ON entries (person_type);

-- =============================================
-- PATTERN SIGNALS
-- =============================================
CREATE TABLE pattern_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  signal_type TEXT NOT NULL,    -- 'recurrence' | 'equity' | 'relationship_drift'
  child_id UUID REFERENCES children,
  pattern_type TEXT,            -- which structural pattern is recurring
  entry_count INTEGER DEFAULT 0,
  window_days INTEGER DEFAULT 14,
  is_active BOOLEAN DEFAULT TRUE,
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pattern_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own pattern signals"
  ON pattern_signals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- WEEKLY DIGESTS
-- =============================================
CREATE TABLE weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own digests"
  ON weekly_digests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX weekly_digests_user_week ON weekly_digests (user_id, week_start_date DESC);

-- =============================================
-- SUPABASE STORAGE BUCKET (voice notes)
-- Run separately if needed
-- =============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('voice-notes', 'voice-notes', false);

-- CREATE POLICY "Users can manage their own voice notes"
--   ON storage.objects FOR ALL
--   USING (auth.uid()::text = (storage.foldername(name))[1]);
