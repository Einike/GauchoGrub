import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, ctx: { params: Promise<{id:string}> }){
  try {
    const me = await requireUser(req);
    const { id } = await ctx.params;
    const { data: order } = await admin.from('orders').select('buyer_id,seller_id').eq('id',id).single();
    if(!order) return NextResponse.json({ error:'Order not found' }, { status:404 });
    if(order.buyer_id !== me.id && order.seller_id !== me.id) return NextResponse.json({ error:'Forbidden' }, { status:403 });
    const { data, error } = await admin.from('messages').select('*').eq('order_id',id).order('created_at',{ascending:true});
    if(error) return NextResponse.json({ error:error.message }, { status:500 });
    return NextResponse.json({ messages:data||[] });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{id:string}> }){
  try {
    const me = await requireUser(req);
    const { id } = await ctx.params;
    const { content } = await req.json();
    if(!content) return NextResponse.json({ error:'content required' }, { status:400 });
    const { data: order } = await admin.from('orders').select('buyer_id,seller_id').eq('id',id).single();
    if(!order) return NextResponse.json({ error:'Order not found' }, { status:404 });
    if(order.buyer_id !== me.id && order.seller_id !== me.id) return NextResponse.json({ error:'Forbidden' }, { status:403 });
    const { data, error } = await admin.from('messages').insert([{order_id:id,sender_id:me.id,content,is_system:false}]).select().single();
    if(error) return NextResponse.json({ error:error.message }, { status:500 });
    return NextResponse.json({ message:data });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}
