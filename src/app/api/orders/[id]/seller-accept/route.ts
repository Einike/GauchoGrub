import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest, ctx: { params: Promise<{id:string}> }){
  try {
    const me = await requireUser(req);
    const { id } = await ctx.params;
    const { data: order, error } = await admin.from('orders').select('*').eq('id',id).single();
    if(error||!order) return NextResponse.json({ error:'Order not found' }, { status:404 });
    if(order.seller_id !== me.id) return NextResponse.json({ error:'Only seller can accept' }, { status:403 });
    if(order.status !== 'paid') return NextResponse.json({ error:'Order must be paid first' }, { status:409 });
    if(order.seller_accept_by && new Date(order.seller_accept_by).getTime() < Date.now()) return NextResponse.json({ error:'Acceptance window expired' }, { status:409 });

    const { data: updated, error:uerr } = await admin
      .from('orders')
      .update({ status:'seller_accepted', updated_at:new Date().toISOString() })
      .eq('id',id)
      .select()
      .single();

    if(uerr) return NextResponse.json({ error:uerr.message }, { status:500 });

    // once accepted, listing leaves live board and moves in progress
    await admin
      .from('listings')
      .update({ status:'in_progress' })
      .eq('id', order.listing_id);

    await admin.from('messages').insert([{order_id:id,sender_id:me.id,content:'Seller accepted. Uploading QR soon.',is_system:true}]);
    return NextResponse.json({ order:updated });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}