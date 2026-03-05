import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authServer';
import { admin } from '@/lib/supabaseAdmin';
import { ACTIVE_ORDER_STATUSES, CLAIM_COOLDOWN_MS } from '@/lib/status';
import { isOrtegaOpen } from '@/lib/ortegaHours';
import { notify } from '@/lib/notify';
import { auditLog } from '@/lib/audit';

const claimAttempts = new Map<string, number>(); // userId → last attempt ts

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u      = await requireUser(req);
    const { id } = await ctx.params;

    if (!isOrtegaOpen())
      return NextResponse.json({ error: 'Ortega is currently closed.' }, { status: 400 });

    // Rate limit
    const last    = claimAttempts.get(u.id) ?? 0;
    const elapsed = Date.now() - last;
    if (elapsed < CLAIM_COOLDOWN_MS) {
      const wait = Math.ceil((CLAIM_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json({ error: `Wait ${wait}s before claiming again` }, { status: 429 });
    }
    claimAttempts.set(u.id, Date.now());

    // Check active orders (also enforced by DB partial index in RPC)
    const { data: ao } = await admin.from('orders')
      .select('id').eq('buyer_id', u.id).in('status', ACTIVE_ORDER_STATUSES).limit(1);
    if (ao?.length)
      return NextResponse.json({ error: 'You already have an active order' }, { status: 409 });

    const lock_until = new Date(Date.now() + 10 * 60_000).toISOString();
    const { data, error } = await admin.rpc('claim_listing_atomic', {
      p_listing_id: id, p_buyer_id: u.id, p_lock_until: lock_until,
    });

    if (error) { console.error('[claim]', error); return NextResponse.json({ error: 'Claim failed' }, { status: 500 }); }
    if (!data?.ok) return NextResponse.json({ error: data?.error ?? 'Claim failed' }, { status: 409 });

    const order = data.order;
    await auditLog(u.id, 'order.claim', 'order', order.id, { listing_id: id });
    await notify(order.seller_id, 'listing_claimed', '🎉 Meal claimed!',
      'A buyer locked your listing. Accept their order when they submit meal choices.', `/orders/${order.id}`);

    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
