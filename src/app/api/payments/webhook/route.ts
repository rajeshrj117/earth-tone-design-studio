import { NextRequest } from 'next/server';
export async function POST(_req: NextRequest) {
  return Response.json({ error: 'Online payment transactions are disabled. Please use manual payment submission.' }, { status: 410 });
}
