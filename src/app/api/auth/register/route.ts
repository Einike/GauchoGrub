import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authServer";
import { admin } from "@/lib/supabaseAdmin";

const S = z.object({ username:z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/), display_name:z.string().max(40).optional(), role_mode:z.enum(['buyer','seller']) });

export async function POST(req: NextRequest){
  try {
    const me = await requireUser(req);
    const body = await req.json();
    const p = S.safeParse(body);
    if(!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
    const { username, display_name, role_mode } = p.data;
    const { data: existing } = await admin.from('users').select('id').eq('username', username).neq('id', me.id).maybeSingle();
    if (existing) return NextResponse.json({ error:'Username already taken' }, { status: 409 });
    const { error } = await admin.from('users').upsert({ id: me.id, email: me.email, username, display_name: display_name || null, role_mode });
    if(error) return NextResponse.json({ error:error.message }, { status: 500 });
    return NextResponse.json({ ok:true });
  } catch (e:any) { return NextResponse.json({ error:e.message }, { status: 401 }); }
}
