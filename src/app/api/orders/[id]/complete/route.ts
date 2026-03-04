import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest, ctx: { params: Promise<{id:string}> }){
  try {
    const me = await requireUser(req);
    const { id } = await ctx.params;
    const { data: order, error } = await admin.from('orders').select('*').eq('id',id).single();
    if(error||!order) return NextResponse.json({ error:'Order not found' }, { status:404 });
    if(order.buyer_id !== me.id) return NextResponse.json({ error:'Only buyer confirms completion' }, { status:403 });
    if(order.status !== 'qr_uploaded') return NextResponse.json({ error:'QR not uploaded yet' }, { status:409 });

    const { data: updated, error:uerr } = await admin
      .from('orders')
      .update({ status:'completed', updated_at:new Date().toISOString() })
      .eq('id',id)
      .select()
      .single();

    if(uerr) return NextResponse.json({ error:uerr.message }, { status:500 });

    await admin
      .from('listings')
      .update({ status:'completed', quantity_remaining:0 })
      .eq('id', order.listing_id);

    await admin.from('messages').insert([{order_id:id,sender_id:me.id,content:'Buyer confirmed successful pickup ✅',is_system:true}]);
    return NextResponse.json({ order:updated });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}