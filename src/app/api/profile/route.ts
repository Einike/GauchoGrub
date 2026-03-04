import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest){
  try {
    const me = await requireUser(req);
    const { data, error } = await admin.from('users').select('*').eq('id', me.id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 401 }); }
}
