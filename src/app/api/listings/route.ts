import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

const MIN_PRICE_CENTS = 0;
const MAX_PRICE_CENTS = 600;

export async function GET(req: NextRequest){
try {
await requireUser(req);

// Safer query: no FK-name dependency
const { data: rows, error } = await admin
.from('listings')
.select('id,price_cents,dining_location,expires_at,tags,seller_id,status,created_at')
.eq('status','open')
.order('created_at',{ascending:false})
.limit(100);

if(error) return NextResponse.json({ error:error.message }, { status:500 });

const sellerIds = [...new Set((rows || []).map((r:any)=>r.seller_id).filter(Boolean))];
let sellerMap: Record<string, { username?: string; rating_avg?: number }> = {};

if (sellerIds.length > 0) {
const { data: sellers } = await admin
.from('users')
.select('id,username,rating_avg')
.in('id', sellerIds);

sellerMap = Object.fromEntries((sellers || []).map((s:any)=>[s.id, s]));
}

const listings = (rows||[]).map((x:any)=>({
id:x.id,
price_cents:x.price_cents,
dining_location:x.dining_location,
expires_at:x.expires_at,
tags:x.tags||[],
seller_username:sellerMap[x.seller_id]?.username || 'seller',
seller_rating:Number(sellerMap[x.seller_id]?.rating_avg || 5)
}));

return NextResponse.json({ listings });
} catch (e:any) {
return NextResponse.json({ error:e.message }, { status:401 });
}
}

export async function POST(req: NextRequest){
try {
const me = await requireUser(req);
const body = await req.json();
const { price_cents, dining_location, expires_at, tags } = body;

if (price_cents == null || !expires_at) {
return NextResponse.json({ error:'Missing fields' }, { status:400 });
}

if (price_cents < MIN_PRICE_CENTS || price_cents > MAX_PRICE_CENTS) {
return NextResponse.json({ error:'Price must be between $0 and $6.00' }, { status:400 });
}

const available_quantity = 1;

const ninetyMinutesAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();
const { data: recent } = await admin
.from('listings')
.select('id,created_at')
.eq('seller_id', me.id)
.gte('created_at', ninetyMinutesAgo)
.order('created_at', { ascending: false })
.limit(1)
.maybeSingle();

if (recent) {
return NextResponse.json({ error:'You can only post one meal every 90 minutes.' }, { status:409 });
}

const { data: active } = await admin
.from('listings')
.select('id')
.eq('seller_id', me.id)
.in('status',['open','locked','in_progress'])
.maybeSingle();

if(active) return NextResponse.json({ error:'You already have an active listing' }, { status:409 });

const pickup_start = new Date().toISOString();
const pickup_end = expires_at;

const { data, error } = await admin.from('listings').insert([{
seller_id:me.id,
price_cents,
available_quantity,
quantity_remaining:available_quantity,
dining_location:dining_location||'Ortega',
status:'open',
expires_at,
pickup_start,
pickup_end,
fee_cents: 0,
total_cents: price_cents,
tags:tags||[]
}]).select().single();

if(error) return NextResponse.json({ error:error.message }, { status:500 });

return NextResponse.json({ listing:data });
} catch (e:any) {
return NextResponse.json({ error:e.message }, { status:401 });
}
}
