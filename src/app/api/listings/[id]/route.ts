import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authServer';
import { admin } from '@/lib/supabaseAdmin';
import { ListingStatus } from '@/lib/status';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u      = await requireUser(req);
    const { id } = await ctx.params;
    const { data: l } = await admin.from('listings').select('seller_id,status').eq('id', id).single();
    if (!l) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (l.seller_id !== u.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if ([ListingStatus.COMPLETED, ListingStatus.CANCELLED, ListingStatus.EXPIRED].includes(l.status as any))
      return NextResponse.json({ error: 'Cannot cancel this listing' }, { status: 400 });
    await admin.from('listings').update({ status: ListingStatus.CANCELLED }).eq('id', id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
