import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authServer';
import { admin } from '@/lib/supabaseAdmin';
import { OrderStatus } from '@/lib/status';
import { notify } from '@/lib/notify';
import { auditLog } from '@/lib/audit';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u      = await requireUser(req);
    const { id } = await ctx.params;
    const { data: order } = await admin.from('orders').select('*').eq('id', id).single();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.seller_id !== u.id) return NextResponse.json({ error: 'Only seller can accept' }, { status: 403 });
    if (order.status !== OrderStatus.BUYER_SUBMITTED)
      return NextResponse.json({ error: `Cannot accept order in status ${order.status}` }, { status: 400 });

    await admin.from('orders').update({ status: OrderStatus.SELLER_ACCEPTED, updated_at: new Date().toISOString() }).eq('id', id);
    await auditLog(u.id, 'order.accept', 'order', id);
    await notify(order.buyer_id, 'order_accepted', '✅ Seller accepted!',
      'They\'re uploading the Ortega QR. Check back soon.', `/orders/${id}`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
