import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest, ctx: { params: Promise<{id:string}> }){
  try {
    const me = await requireUser(req);
    const { id } = await ctx.params;
    const { qr_image_url } = await req.json();
    if(!qr_image_url) return NextResponse.json({ error:'qr_image_url required' }, { status:400 });
    const { data: order, error } = await admin.from('orders').select('*').eq('id',id).single();
    if(error||!order) return NextResponse.json({ error:'Order not found' }, { status:404 });
    if(order.seller_id !== me.id) return NextResponse.json({ error:'Only seller can upload QR' }, { status:403 });
    if(order.status !== 'seller_accepted') return NextResponse.json({ error:'Order must be seller_accepted' }, { status:409 });
    const { data: updated, error:uerr } = await admin.from('orders').update({ status:'qr_uploaded', qr_image_url, qr_uploaded_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id',id).select().single();
    if(uerr) return NextResponse.json({ error:uerr.message }, { status:500 });
    await admin.from('messages').insert([{order_id:id,sender_id:me.id,content:'QR uploaded. Buyer can now pick up.',is_system:true}]);
    return NextResponse.json({ order:updated });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}
