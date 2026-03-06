import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authServer';
import { admin } from '@/lib/supabaseAdmin';
import { OrderStatus, ListingStatus } from '@/lib/status';
import { notify } from '@/lib/notify';
import { auditLog } from '@/lib/audit';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u      = await requireUser(req);
    const { id } = await ctx.params;

    const { data: order, error: fetchErr } = await admin
      .from('orders').select('*').eq('id', id).single();
    if (fetchErr || !order)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.buyer_id !== u.id && order.seller_id !== u.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status as any))
      return NextResponse.json({ error: 'Cannot cancel at this stage' }, { status: 400 });

    // Update order — check error
    const { error: orderErr } = await admin.from('orders')
      .update({ status: OrderStatus.CANCELLED, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (orderErr) {
      console.error('[cancel] order update failed:', orderErr);
      return NextResponse.json({ error: `Failed to cancel order: ${orderErr.message}` }, { status: 500 });
    }

    // Restore listing based on current order stage:
    // If the order was just LOCKED (buyer never submitted) → can safely reopen
    // If order progressed further (seller engaged) → cancel listing entirely, don't re-open
    const shouldReopen = order.status === OrderStatus.LOCKED;
    const listingUpdate = shouldReopen
      ? { status: ListingStatus.OPEN, locked_by: null, lock_until: null }
      : { status: ListingStatus.CANCELLED };

    const { error: listingErr } = await admin.from('listings')
      .update(listingUpdate)
      .eq('id', order.listing_id);
    if (listingErr) {
      // Non-fatal — order is cancelled, listing stuck in LOCKED is better than re-opening mid-order
      console.error('[cancel] listing update failed (non-fatal):', listingErr);
    }

    await auditLog(u.id, 'order.cancel', 'order', id, { was_status: order.status });

    const other    = u.id === order.buyer_id ? order.seller_id : order.buyer_id;
    const isSeller = u.id === order.seller_id;
    await notify(
      other, 'order_cancelled', '❌ Order cancelled',
      isSeller
        ? 'The seller cancelled this order.'
        : 'The buyer cancelled this order.',
      `/orders/${id}`
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[cancel] unexpected error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
