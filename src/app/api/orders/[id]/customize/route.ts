import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authServer';
import { admin } from '@/lib/supabaseAdmin';
import { OrderStatus } from '@/lib/status';
import { validateOrderItems, getMealPeriod, OrderItems } from '@/lib/menu';
import { notify } from '@/lib/notify';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u      = await requireUser(req);
    const { id } = await ctx.params;

    const { data: order } = await admin.from('orders').select('*').eq('id', id).single();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.buyer_id !== u.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (order.status !== OrderStatus.LOCKED)
      return NextResponse.json({ error: `Cannot customize order in status ${order.status}` }, { status: 400 });

    const period = getMealPeriod();
    if (period === 'closed') return NextResponse.json({ error: 'Ortega is currently closed' }, { status: 400 });

    const body: OrderItems = await req.json().catch(() => ({}));
    const v = validateOrderItems(body, period);
    if (!v.ok) return NextResponse.json({ error: v.errors[0], errors: v.errors }, { status: 422 });

    await admin.from('orders').update({
      order_items: body,
      status:      OrderStatus.BUYER_SUBMITTED,
      updated_at:  new Date().toISOString(),
    }).eq('id', id);

    await notify(order.seller_id, 'buyer_submitted', '🍽️ Buyer chose their meal',
      'Review their selection and accept the order.', `/orders/${id}`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
