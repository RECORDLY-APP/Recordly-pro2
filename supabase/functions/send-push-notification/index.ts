import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@recordly.app';

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
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
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    if (body.action === 'vapid_key') {
      return new Response(JSON.stringify({ vapidPublicKey: VAPID_PUBLIC_KEY || '' }), { status: 200, headers });
    }
    const eventType = String(body.event || body.type || 'payment_logged');
    const personId = body.person_id ? String(body.person_id) : '';
    const recordId = body.record_id ? String(body.record_id) : '';
    const title = String(body.title || 'Recordly Update').slice(0, 120);
    const message = String(body.body || 'You have a new payment update.').slice(0, 280);
    const url = String(body.url || body.link || '#/notifications').slice(0, 200);

    let targetUserId: string | null = null;
    let resolvedRecordOwner: string | null = null;

    if (personId) {
      const { data: person } = await admin
        .from('people')
        .select('id, user_id, record_id, records!inner(owner_id)')
        .eq('id', personId)
        .maybeSingle();

      if (!person) {
        return new Response(JSON.stringify({ error: 'Person not found' }), { status: 404, headers });
      }
      resolvedRecordOwner = (person.records as { owner_id: string }).owner_id;

      const isOwner = resolvedRecordOwner === caller.id;
      const isBuyer = person.user_id === caller.id;
      let isStaff = false;
      if (!isOwner && !isBuyer) {
        const { data: staffRow } = await admin
          .from('team_members')
          .select('id')
          .eq('owner_id', resolvedRecordOwner)
          .eq('staff_user_id', caller.id)
          .eq('status', 'active')
          .maybeSingle();
        isStaff = !!staffRow;
      }

      if (!isOwner && !isStaff && !(isBuyer && eventType === 'payment_reported')) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
      }

      targetUserId = eventType === 'payment_reported' ? resolvedRecordOwner : (person.user_id ?? null);
    } else if (recordId) {
      const { data: rec } = await admin
        .from('records')
        .select('id, owner_id')
        .eq('id', recordId)
        .maybeSingle();
      if (!rec) return new Response(JSON.stringify({ error: 'Record not found' }), { status: 404, headers });
      targetUserId = rec.owner_id;
    }

    if (!targetUserId || targetUserId === caller.id) {
      return new Response(JSON.stringify({ sent: 0, stored: false, reason: 'No external target user' }), { status: 200, headers });
    }

    // Store in persistent notifications inbox table
    try {
      await admin.from('notifications').insert({
        user_id: targetUserId,
        kind: eventType,
        title,
        body: message,
        link: url,
        read: false,
      });
    } catch (_) {}

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ sent: 0, stored: true, reason: 'VAPID keys not configured on Edge Function' }), { status: 200, headers });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', targetUserId);

    if (!subs || !subs.length) {
      return new Response(JSON.stringify({ sent: 0, stored: true, reason: 'No push subscriptions for user' }), { status: 200, headers });
    }

    const payload = JSON.stringify({ title, body: message, url, tag: `rc-${eventType}-${personId || recordId || Date.now()}` });
    let sent = 0;
    const staleIds: string[] = [];

    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err ? Number((err as { statusCode?: number }).statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) staleIds.push(s.id);
      }
    }));

    if (staleIds.length) {
      await admin.from('push_subscriptions').delete().in('id', staleIds);
    }

    return new Response(JSON.stringify({ sent, stored: true }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Push dispatch failed' }), { status: 500, headers });
  }
});
