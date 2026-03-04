import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest, ctx: { params: Promise<{id:string}> }){
  try {
    const me = await requireUser(req);
    const { id } = await ctx.params;
    const now = new Date();
    const lockUntil = new Date(now.getTime()+10*60*1000).toISOString();

    const { data: listing, error: lerr } = await admin.from('listings').select('*').eq('id',id).single();
    if(lerr || !listing) return NextResponse.json({ error:'Listing not found' }, { status:404 });
    if(listing.status !== 'open') return NextResponse.json({ error:'Already locked/unavailable' }, { status:409 });

    const { error: uerr } = await admin.from('listings').update({ status:'locked', locked_by:me.id, lock_until:lockUntil }).eq('id',id).eq('status','open');
    if(uerr) return NextResponse.json({ error:uerr.message }, { status:500 });

    const { data: order, error:oerr } = await admin.from('orders').insert([{listing_id:id,seller_id:listing.seller_id,buyer_id:me.id,status:'locked',quantity:1,amount_cents:listing.price_cents,platform_fee_cents:0,seller_payout_cents:listing.price_cents,lock_expires_at:lockUntil}]).select().single();
    if(oerr) return NextResponse.json({ error:oerr.message }, { status:500 });

    await admin.from('messages').insert([{order_id:order.id,sender_id:me.id,content:'Order locked. Complete payment in 10 minutes.',is_system:true}]);
    return NextResponse.json({ order });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}
