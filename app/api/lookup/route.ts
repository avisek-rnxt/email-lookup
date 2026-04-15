import { NextRequest, NextResponse } from 'next/server';
import { findEmail } from '@/lib/finder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, domain } = await req.json();
    if (!firstName || !lastName || !domain) {
      return NextResponse.json({ error: 'firstName, lastName, domain required' }, { status: 400 });
    }
    const result = await findEmail(String(firstName), String(lastName), String(domain));
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown error' }, { status: 500 });
  }
}
