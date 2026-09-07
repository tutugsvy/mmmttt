import { loadTokenLive } from '../../../lib/live';

export const dynamic = 'force-dynamic';
export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token');
  try { return Response.json(await loadTokenLive(token), { headers: { 'cache-control': 'no-store' } }); }
  catch (e) { return Response.json({ error: e?.message || 'live data unavailable' }, { status: 502 }); }
}
