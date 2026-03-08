import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Secured Vercel Cron endpoint — runs every Friday at 8pm UTC
// Add to vercel.json: { "crons": [{ "path": "/api/cron/weekly-digest", "schedule": "0 20 * * 5" }] }
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users who have completed onboarding
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('onboarding_complete', true);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lifeos.app';
    let processed = 0;

    for (const profile of profiles) {
      try {
        // Generate digest
        const digestRes = await fetch(`${appUrl}/api/generate-digest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.user_id }),
        });

        if (!digestRes.ok) continue;
        const { digestId } = await digestRes.json();

        // Get user email
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
        if (!user?.email || !digestId) continue;

        // Send email
        await fetch(`${appUrl}/api/send-digest-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ digestId, userEmail: user.email }),
        });

        processed++;
      } catch (e) {
        console.error(`Failed for user ${profile.user_id}:`, e);
      }
    }

    return NextResponse.json({ processed });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
