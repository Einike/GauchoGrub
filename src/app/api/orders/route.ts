import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest){
  try {
    const me = await requireUser(req);
    const { data, error } = await admin.from('orders').select('*').or(`buyer_id.eq.${me.id},seller_id.eq.${me.id}`).order('created_at',{ascending:false}).limit(100);
    if(error) return NextResponse.json({ error:error.message }, { status:500 });
    return NextResponse.json({ orders:data||[] });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status:401 }); }
}
