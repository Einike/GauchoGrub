import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authServer';
import { admin } from '@/lib/supabaseAdmin';
import { ListingStatus, ACTIVE_LISTING_STATUSES, SELLER_COOLDOWN_MS } from '@/lib/status';
import { ortegaClosedReason } from '@/lib/ortegaHours';
import { notify } from '@/lib/notify';
import { auditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const now = new Date().toISOString();

    // Auto-expire stale locks
    await admin.from('listings')
      .update({ status: ListingStatus.OPEN, locked_by: null, lock_until: null })
      .eq('status', ListingStatus.LOCKED).lt('lock_until', now);

    const { data: rows, error } = await admin
      .from('listings')
      .select('id,seller_id,price_cents,expires_at,status,created_at,tags')
      .eq('status', ListingStatus.OPEN)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to load listings' }, { status: 500 });

    const sellerIds = [...new Set((rows ?? []).map((r: any) => r.seller_id))];
    let sellerMap: Record<string, string> = {};
    if (sellerIds.length) {
      const { data: ps } = await admin.from('profiles').select('id,username').in('id', sellerIds);
      sellerMap = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p.username ?? 'seller']));
    }

    return NextResponse.json({
      listings: (rows ?? []).map((x: any) => ({ ...x, seller_username: sellerMap[x.seller_id] ?? 'seller' })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const u = await requireUser(req);

    // Hours gate
    const closed = ortegaClosedReason();
    if (closed) return NextResponse.json({ error: closed }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { price_cents, expires_at } = body;

    if (price_cents == null || !expires_at)
      return NextResponse.json({ error: 'price_cents and expires_at are required' }, { status: 400 });
    if (typeof price_cents !== 'number' || price_cents < 0 || price_cents > 600)
      return NextResponse.json({ error: 'Price must be $0–$6.00' }, { status: 400 });
    if (new Date(expires_at) <= new Date())
      return NextResponse.json({ error: 'expires_at must be in the future' }, { status: 400 });

    const nowIso = new Date().toISOString();

    // Auto-cancel stale
    await admin.from('listings').update({ status: ListingStatus.EXPIRED })
      .eq('seller_id', u.id)
      .in('status', [ListingStatus.OPEN, ListingStatus.LOCKED])
      .lt('expires_at', nowIso);

    // Active listing check (DB partial index also enforces this)
    const { data: active } = await admin.from('listings')
      .select('id,expires_at')
      .eq('seller_id', u.id)
      .in('status', ACTIVE_LISTING_STATUSES)
      .gt('expires_at', nowIso)
      .limit(1);
    if (active?.length)
      return NextResponse.json({ error: 'You already have an active listing', active_listing_id: active[0].id, active_expires_at: active[0].expires_at }, { status: 409 });

    // Seller cooldown — must wait after last completed/cancelled
    const cooldownAfter = new Date(Date.now() - SELLER_COOLDOWN_MS).toISOString();
    const { data: recent } = await admin.from('listings')
      .select('completed_at,created_at')
      .eq('seller_id', u.id)
      .in('status', [ListingStatus.COMPLETED, ListingStatus.CANCELLED, ListingStatus.EXPIRED])
      .gt('created_at', cooldownAfter)
      .order('created_at', { ascending: false })
      .limit(1);
    if (recent?.length) {
      const wait = Math.ceil((new Date(recent[0].created_at).getTime() + SELLER_COOLDOWN_MS - Date.now()) / 60_000);
      return NextResponse.json({ error: `Please wait ${wait} more min before posting again (cooldown)` }, { status: 429 });
    }

    const { data, error } = await admin.from('listings').insert([{
      seller_id:          u.id,
      dining_location:    'Ortega',
      price_cents,
      status:             ListingStatus.OPEN,
      expires_at,
      pickup_start:       nowIso,
      pickup_end:         expires_at,
      available_quantity: 1,
      quantity_remaining: 1,
      fee_cents:          0,
      total_cents:        price_cents,
      tags:               [],
    }]).select().single();

    if (error) {
      // Handle partial index violation (active listing exists)
      if (error.message.includes('listings_one_active_per_seller'))
        return NextResponse.json({ error: 'You already have an active listing' }, { status: 409 });
      console.error('[listing.create]', error);
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
    }

    await auditLog(u.id, 'listing.create', 'listing', data.id, { price_cents });
    return NextResponse.json({ listing: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
