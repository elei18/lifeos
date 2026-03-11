import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as unknown as ReturnType<typeof createClient>;

// =============================================
// TYPE DEFINITIONS
// =============================================

export type PersonType = 'child' | 'partner' | 'self' | 'household';
export type EnrichmentStatus = 'pending' | 'complete' | 'failed';
export type UserIntent = 'sensemaking' | 'calibration';
export type PatternType =
  | 'Transition Overload'
  | 'Boundary Erosion'
  | 'Misaligned Expectations'
  | 'Authority Confusion'
  | 'Emotional Spillover'
  | 'Capacity Mismatch'
  | 'Anticipatory Stress'
  | 'Routine Drift'
  | 'Third-Party Interference'
  | 'Early Warning Signal';

export type Category =
  | 'Child Behavior'
  | 'Parent Care'
  | 'Relationship/Spouse'
  | 'Self/Personal'
  | 'Logistics'
  | 'Other';

export type Sentiment =
  | 'Positive'
  | 'Neutral'
  | 'Negative'
  | 'Mixed'
  | 'Stressed'
  | 'Overwhelmed'
  | 'Tired'
  | 'Proud'
  | 'Relieved'
  | 'Frustrated';

export type SignalType = 'recurrence' | 'equity' | 'relationship_drift';

// =============================================
// INTERFACES
// =============================================

export interface UserProfile {
  id: string;
  user_id: string;
  partner_name: string | null;
  digest_day: number;       // 0=Sun, 5=Fri
  digest_time: string;      // HH:MM
  timezone: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  user_id: string;
  name: string;
  date_of_birth: string | null;
  display_order: number;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  child_id: string | null;
  person_type: PersonType;
  raw_text: string;
  voice_note_url: string | null;

  // AI enrichment
  enrichment_status: EnrichmentStatus;
  person_id: string | null;
  user_intent: UserIntent | null;
  pattern_type: PatternType | null;
  cleaned_text: string | null;
  category: Category | null;
  sentiment: Sentiment | null;
  tags: string[];
  summary: string | null;
  interpretation: string | null;
  coaching_micro: string | null;
  suggested_reflection: string | null;

  created_at: string;

  // Joined
  child?: Child;
}

export interface PatternSignal {
  id: string;
  user_id: string;
  signal_type: SignalType;
  child_id: string | null;
  pattern_type: PatternType | null;
  entry_count: number;
  window_days: number;
  is_active: boolean;
  first_detected_at: string;
  last_detected_at: string;
  created_at: string;

  // Joined
  child?: Child;
}

export interface DigestSection {
  child_name: string | null;
  person_type: PersonType;
  observations: string[];
  pattern_note: string | null;
  micro_action: string;
}

export interface DigestContent {
  headline: string;
  sections: DigestSection[];
  equity_note: string | null;
  reflection_prompt: string;
}

export interface WeeklyDigest {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  content: DigestContent;
  email_sent_at: string | null;
  created_at: string;
}

// =============================================
// CRUD API OBJECTS
// =============================================

export const profileApi = {
  async get(userId: string): Promise<UserProfile | null> {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  },

  async upsert(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single();
    return data;
  },
};

export const childrenApi = {
  async list(userId: string): Promise<Child[]> {
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });
    return data || [];
  },

  async create(userId: string, child: Omit<Child, 'id' | 'user_id' | 'created_at'>): Promise<Child | null> {
    const { data } = await supabase
      .from('children')
      .insert({ user_id: userId, ...child })
      .select()
      .single();
    return data;
  },

  async update(id: string, updates: Partial<Child>): Promise<Child | null> {
    const { data } = await supabase
      .from('children')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return data;
  },

  async delete(id: string): Promise<void> {
    await supabase.from('children').delete().eq('id', id);
  },
};

export const entriesApi = {
  async list(userId: string, options?: {
    childId?: string;
    personType?: PersonType;
    limit?: number;
    offset?: number;
  }): Promise<Entry[]> {
    let query = supabase
      .from('entries')
      .select('*, child:children(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.childId) query = query.eq('child_id', options.childId);
    if (options?.personType) query = query.eq('person_type', options.personType);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1);

    const { data } = await query;
    return data || [];
  },

  async get(id: string): Promise<Entry | null> {
    const { data } = await supabase
      .from('entries')
      .select('*, child:children(*)')
      .eq('id', id)
      .single();
    return data;
  },

  async create(userId: string, entry: {
    child_id?: string | null;
    person_type: PersonType;
    raw_text: string;
    voice_note_url?: string | null;
  }): Promise<Entry | null> {
    const { data } = await supabase
      .from('entries')
      .insert({ user_id: userId, ...entry })
      .select()
      .single();
    return data;
  },

  async updateEnrichment(id: string, enrichment: Partial<Entry>): Promise<Entry | null> {
    const { data } = await supabase
      .from('entries')
      .update({ ...enrichment, enrichment_status: 'complete' })
      .eq('id', id)
      .select()
      .single();
    return data;
  },

  async listInWindow(userId: string, days: number): Promise<Entry[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
      .from('entries')
      .select('*, child:children(*)')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    return data || [];
  },
};

export const patternSignalsApi = {
  async list(userId: string): Promise<PatternSignal[]> {
    const { data } = await supabase
      .from('pattern_signals')
      .select('*, child:children(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_detected_at', { ascending: false });
    return data || [];
  },

  async upsert(signal: Omit<PatternSignal, 'id' | 'created_at' | 'first_detected_at' | 'child'>): Promise<void> {
    // Check for existing active signal of same type
    const { data: existing } = await supabase
      .from('pattern_signals')
      .select('id')
      .eq('user_id', signal.user_id)
      .eq('signal_type', signal.signal_type)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('pattern_signals')
        .update({ entry_count: signal.entry_count, last_detected_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('pattern_signals').insert(signal);
    }
  },
};

export const digestApi = {
  async getLatest(userId: string): Promise<WeeklyDigest | null> {
    const { data } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .single();
    return data;
  },

  async list(userId: string): Promise<WeeklyDigest[]> {
    const { data } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false });
    return data || [];
  },

  async create(digest: Omit<WeeklyDigest, 'id' | 'created_at'>): Promise<WeeklyDigest | null> {
    const { data } = await supabase
      .from('weekly_digests')
      .insert(digest)
      .select()
      .single();
    return data;
  },

  async markEmailSent(id: string): Promise<void> {
    await supabase
      .from('weekly_digests')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', id);
  },
};
