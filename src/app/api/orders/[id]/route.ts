import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, ctx: { params: Promise<{id:string}> }){
  try {
    const me = await requireUser(req);
    const { id } = await ctx.params;
    const { data, error } = await admin.from('orders').select('*').eq('id',id).single();
    if(error || !data) return NextResponse.json({ error:'Order not found' }, { status:404 });
    if(data.buyer_id !== me.id && data.seller_id !== me.id) return NextResponse.json({ error:'Forbidden' }, { status:403 });
    return NextResponse.json({ order:data });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}
