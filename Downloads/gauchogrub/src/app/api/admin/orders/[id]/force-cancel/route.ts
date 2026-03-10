import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { admin } from '@/lib/supabaseAdmin';
import { auditLog } from '@/lib/audit';
import { notify } from '@/lib/notify';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor  = await requireAdmin(req);
    const { id } = await ctx.params;
    const body   = await req.json().catch(() => ({}));
    const reason = (body.reason as string) || 'Cancelled by admin';

    const { data: order, error: fetchErr } = await admin
      .from('orders').select('*').eq('id', id).single();
    if (fetchErr || !order)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (['COMPLETED', 'CANCELLED'].includes(order.status))
      return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 400 });

    const { error: orderErr } = await admin.from('orders')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', id);
    if (orderErr)
      return NextResponse.json({ error: orderErr.message }, { status: 500 });

    // Restore listing to OPEN
    await admin.from('listings')
      .update({ status: 'OPEN', locked_by: null, lock_until: null })
      .eq('id', order.listing_id)
      .in('status', ['LOCKED', 'IN_PROGRESS']);

    await auditLog(actor.id, 'admin.force_cancel', 'order', id, { reason, prev_status: order.status });

    await notify(order.buyer_id, 'order_cancelled', '❌ Order cancelled by admin', reason, `/orders/${id}`);
    await notify(order.seller_id, 'order_cancelled', '❌ Order cancelled by admin', reason, `/orders/${id}`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
