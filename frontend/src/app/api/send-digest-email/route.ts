import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import type { DigestContent } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildEmailHtml(content: DigestContent, appUrl: string): string {
  const personEmoji: Record<string, string> = {
    child: '🧒', partner: '🤝', self: '🪞', household: '🏠',
  };

  const sectionsHtml = content.sections.map(section => `
    <div style="margin-bottom:24px;padding:20px;background:#fffbf5;border-radius:16px;border:1px solid #fde68a;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">
        ${personEmoji[section.person_type] || ''} ${section.child_name || section.person_type}
      </p>
      ${section.observations.map(obs => `
        <p style="margin:0 0 8px;font-size:15px;color:#44403c;line-height:1.6;">• ${obs}</p>
      `).join('')}
      ${section.pattern_note ? `
        <p style="margin:12px 0 0;font-size:13px;color:#78716c;font-style:italic;">${section.pattern_note}</p>
      ` : ''}
      <div style="margin-top:16px;padding:12px 16px;background:#1c1917;border-radius:10px;">
        <p style="margin:0;font-size:13px;color:#fff;font-weight:500;line-height:1.5;">${section.micro_action}</p>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#d97706;text-transform:uppercase;letter-spacing:0.05em;">
        LifeOS · Weekly Digest
      </p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#1c1917;line-height:1.3;">
        ${content.headline}
      </h1>
    </div>

    <!-- Sections -->
    ${sectionsHtml}

    <!-- Equity note -->
    ${content.equity_note ? `
      <div style="margin-bottom:24px;padding:16px;background:#fff;border-radius:12px;border:1px solid #e7e5e4;">
        <p style="margin:0;font-size:13px;color:#78716c;line-height:1.6;">💡 ${content.equity_note}</p>
      </div>
    ` : ''}

    <!-- Reflection -->
    <div style="margin-bottom:32px;padding:20px;background:#fff;border-radius:16px;border:1px solid #e7e5e4;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#a8a29e;text-transform:uppercase;letter-spacing:0.05em;">
        A thought for the week ahead
      </p>
      <p style="margin:0;font-size:15px;color:#57534e;line-height:1.6;font-style:italic;">
        ${content.reflection_prompt}
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${appUrl}/digest" style="display:inline-block;padding:14px 28px;background:#b45309;color:#fff;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
        View in LifeOS →
      </a>
    </div>

    <!-- Footer -->
    <p style="margin:0;font-size:12px;color:#a8a29e;text-align:center;line-height:1.6;">
      Light evidence. Lots of heart.<br>
      <a href="${appUrl}/settings" style="color:#a8a29e;">Manage digest settings</a>
    </p>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { digestId, userEmail } = await req.json();
    if (!digestId || !userEmail) {
      return NextResponse.json({ error: 'Missing digestId or userEmail' }, { status: 400 });
    }

    const { data: digest } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('id', digestId)
      .single();

    if (!digest) return NextResponse.json({ error: 'Digest not found' }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lifeos.app';

    await resend.emails.send({
      from: 'LifeOS <digest@lifeos.app>',
      to: userEmail,
      subject: `Your week at a glance 🌅`,
      html: buildEmailHtml(digest.content, appUrl),
    });

    // Mark email sent
    await supabase
      .from('weekly_digests')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', digestId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }
}
