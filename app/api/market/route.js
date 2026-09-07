export const dynamic = 'force-dynamic';

// MOTIVE surfaces only its own launch registry. External market providers are
// intentionally not used to populate Discover or the public market identity.
export async function GET() {
  return Response.json({ tokens: [] }, { headers: { 'cache-control': 'no-store' } });
}
