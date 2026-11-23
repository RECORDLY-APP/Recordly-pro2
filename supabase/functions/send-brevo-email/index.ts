import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BREVO_API_KEY = (Deno.env.get('BREVO_API_KEY') ?? '').trim();
const BREVO_SENDER_EMAIL = (Deno.env.get('BREVO_SENDER_EMAIL') ?? 'noreply@recordly.app').trim();
const BREVO_SENDER_NAME = (Deno.env.get('BREVO_SENDER_NAME') ?? 'Recordly').trim() || 'Recordly';

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

Deno.serve(async (req: Request) => {
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }
    const caller = authData.user;

    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY is not configured in Supabase Edge Function secrets.' }), { status: 503, headers });
    }
    if (BREVO_API_KEY.startsWith('xsmtpsib-')) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY is an SMTP password (xsmtpsib-...). Use a Brevo v3 API key (xkeysib-...) instead.' }), { status: 400, headers });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type === 'reminder' ? 'reminder' : 'receipt';
    const toEmail = String(body.to_email ?? body.toEmail ?? '').trim().toLowerCase();
    const toName = String(body.to_name ?? body.toName ?? 'Member').trim().slice(0, 100);
    const bizName = String(body.business_name ?? body.businessName ?? 'Recordly Workspace').trim().slice(0, 100);
    const recordTitle = String(body.record_title ?? body.recordTitle ?? 'Payment').trim().slice(0, 120);
    const amount = String(body.amount_formatted ?? body.amount ?? '').slice(0, 40);
    const balance = String(body.balance_formatted ?? body.balance ?? '').slice(0, 40);
    const paidOn = String(body.paid_on ?? body.paidOn ?? '').slice(0, 40);
    const method = String(body.method ?? '').slice(0, 40);
    const receiptRef = String(body.receipt_ref ?? body.receiptRef ?? '').slice(0, 40);
    const dueInfo = String(body.due_info ?? body.dueDate ?? '').slice(0, 120);
    const customMsg = String(body.custom_message ?? body.message ?? '').trim();
    const progressUrl = String(body.progress_url ?? body.link ?? '').trim();
    const safeUrl = /^https?:\/\//i.test(progressUrl) ? progressUrl : '';
    const recordId = (body.record_id || body.recordId) ? String(body.record_id || body.recordId) : '';

    if (!isValidEmail(toEmail)) {
      return new Response(JSON.stringify({ error: 'Valid recipient email address is required.' }), { status: 400, headers });
    }

    // Verify caller owns or staffs the record when record_id is supplied
    if (recordId) {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: rec } = await admin.from('records').select('owner_id').eq('id', recordId).maybeSingle();
      if (rec && rec.owner_id !== caller.id) {
        const { data: staff } = await admin
          .from('team_members')
          .select('id')
          .eq('owner_id', rec.owner_id)
          .eq('staff_user_id', caller.id)
          .eq('status', 'active')
          .maybeSingle();
        if (!staff) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
        }
      }
    }

    const subject = type === 'receipt'
      ? `Payment Receipt ${receiptRef ? '(' + receiptRef + ') ' : ''}from ${bizName}`
      : `Payment Reminder: ${recordTitle} — ${bizName}`;

    const htmlContent = type === 'receipt'
      ? `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:14px;color:#0f172a;background:#ffffff;">
          <div style="font-size:13px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:0.6px;">Official Payment Receipt</div>
          <h2 style="margin:6px 0 2px;font-size:22px;">${esc(bizName)}</h2>
          <p style="margin:0 0 18px;color:#64748b;font-size:14px;">${esc(recordTitle)}${receiptRef ? ' · Ref: ' + esc(receiptRef) : ''}</p>
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:12px;padding:16px;text-align:center;margin-bottom:18px;">
            <div style="font-size:12px;color:#0f766e;font-weight:700;">AMOUNT PAID</div>
            <div style="font-size:28px;font-weight:800;color:#0f766e;margin-top:4px;">${esc(amount)}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Member / Payer</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${esc(toName)}</td></tr>
            ${paidOn ? `<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Date</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${esc(paidOn)}</td></tr>` : ''}
            ${method ? `<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Method</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${esc(method)}</td></tr>` : ''}
            ${balance ? `<tr><td style="padding:8px 0;color:#64748b;">Remaining Balance</td><td style="padding:8px 0;font-weight:700;text-align:right;">${esc(balance)}</td></tr>` : ''}
          </table>
          ${safeUrl ? `<div style="margin-top:20px;text-align:center;"><a href="${esc(safeUrl)}" style="display:inline-block;padding:12px 22px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">View Full Payment Progress</a></div>` : ''}
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Recorded with Recordly · Clear payment accountability.</p>
        </div>`
      : `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:14px;color:#0f172a;background:#ffffff;">
          <div style="font-size:13px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.6px;">Payment Reminder</div>
          <h2 style="margin:6px 0 4px;font-size:20px;">${esc(bizName)}</h2>
          <p style="margin:0 0 14px;color:#475569;font-size:15px;">Hi ${esc(toName)},</p>
          <p style="margin:0 0 14px;color:#334155;font-size:14.5px;line-height:1.5;">${esc(customMsg || `This is a friendly reminder regarding ${recordTitle}.`)}</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:16px;font-size:14px;">
            ${balance ? `<div><strong>Remaining balance:</strong> ${esc(balance)}</div>` : ''}
            ${dueInfo ? `<div style="margin-top:4px;color:#b45309;"><strong>Due status:</strong> ${esc(dueInfo)}</div>` : ''}
          </div>
          ${safeUrl ? `<div style="margin-top:18px;text-align:center;"><a href="${esc(safeUrl)}" style="display:inline-block;padding:12px 22px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Check My Payment Link</a></div>` : ''}
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Sent via Recordly on behalf of ${esc(bizName)}.</p>
        </div>`;

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: bizName || BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject,
        htmlContent,
      }),
    });

    const brevoData = await brevoRes.json().catch(() => ({}));
    if (!brevoRes.ok) {
      return new Response(JSON.stringify({ error: `Brevo (${brevoRes.status}): ${brevoData.message || brevoData.code || 'Failed to send email'}` }), { status: brevoRes.status, headers });
    }

    return new Response(JSON.stringify({ ok: true, messageId: brevoData.messageId || null }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Email send error' }), { status: 500, headers });
  }
});
