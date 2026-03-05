import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authServer';
import { admin } from '@/lib/supabaseAdmin';
import { OrderStatus, ListingStatus } from '@/lib/status';
import { notify } from '@/lib/notify';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u      = await requireUser(req);
    const { id } = await ctx.params;
    const { data: order } = await admin.from('orders').select('*').eq('id', id).single();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.buyer_id !== u.id && order.seller_id !== u.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status as any))
      return NextResponse.json({ error: 'Cannot cancel at this stage' }, { status: 400 });

    await admin.from('orders').update({ status: OrderStatus.CANCELLED, updated_at: new Date().toISOString() }).eq('id', id);
    await admin.from('listings').update({ status: ListingStatus.OPEN, locked_by: null, lock_until: null }).eq('id', order.listing_id);

    const other = u.id === order.buyer_id ? order.seller_id : order.buyer_id;
    const isSeller = u.id === order.seller_id;
    await notify(other, 'order_cancelled', '❌ Order cancelled',
      isSeller ? 'Seller cancelled the order. Listing is back open.' : 'Buyer cancelled the order. Listing is back open.',
      `/orders/${id}`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
