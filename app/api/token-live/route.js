import { loadTokenLive } from '../../../lib/live';

export async function GET() {
  try { return Response.json(await loadTokenLive(), { headers: { 'cache-control': 'no-store' } }); }
  catch (e) { return Response.json({ error: e?.message || 'live data unavailable' }, { status: 502 }); }
}
