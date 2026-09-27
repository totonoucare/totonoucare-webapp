import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { validFunnelEvent } from '@/lib/funnelEvents';
export async function POST(request) {
  try {
    const expected = 'https://mibyo-radar.totonoucare.com';
    if (request.headers.get('origin') !== expected) return new NextResponse(null, { status: 403 });
    const raw = await request.text();
    if (raw.length > 600) return new NextResponse(null, { status: 413 });
    const body = JSON.parse(raw);
    if (!validFunnelEvent(body)) return new NextResponse(null, { status: 400 });
    await createServerClient().rpc('record_signup_funnel', { p_visit: body.visit_id, p_id: body.event_id, p_event: body.event, p_source: body.source || '' });
  } catch { /* Telemetry is optional. */ }
  return new NextResponse(null, { status: 204 });
}
