import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest, ctx: { params: Promise<{id:string}> }){
  try {
    const me = await requireUser(req);
    const { id } = await ctx.params;
    const { customizations } = await req.json();
    const { data: order, error } = await admin.from('orders').select('*').eq('id',id).single();
    if(error||!order) return NextResponse.json({ error:'Order not found' }, { status:404 });
    if(order.buyer_id !== me.id) return NextResponse.json({ error:'Only buyer can pay' }, { status:403 });
    if(order.status !== 'locked') return NextResponse.json({ error:'Order not in locked state' }, { status:409 });
    if(order.lock_expires_at && new Date(order.lock_expires_at).getTime() < Date.now()) return NextResponse.json({ error:'Lock expired' }, { status:409 });

    const sellerAcceptBy = new Date(Date.now()+10*60*1000).toISOString();
    const { data: updated, error:uerr } = await admin.from('orders').update({ status:'paid', payment_intent_id:`pi_demo_${id.slice(0,8)}`, payment_captured:true, customizations: customizations || null, seller_accept_by:sellerAcceptBy, updated_at:new Date().toISOString() }).eq('id',id).select().single();
    if(uerr) return NextResponse.json({ error:uerr.message }, { status:500 });
    await admin.from('messages').insert([{order_id:id,sender_id:me.id,content:'Payment completed. Waiting for seller acceptance.',is_system:true}]);
    return NextResponse.json({ order:updated });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}
