const DEFAULT_TOKEN = '0xc37f9b4eb729a1833f6bbef3400ce4be203dc691';
const RPC = 'https://rpc.mainnet.chain.robinhood.com';
async function rpc(method, params) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message || method); return j.result;
}

export const dynamic = 'force-dynamic';
export async function GET(request) {
  const resolution = new URL(request.url).searchParams.get('resolution') || '5m';
  const token = String(new URL(request.url).searchParams.get('token') || DEFAULT_TOKEN).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(token)) return Response.json({ error: 'Invalid token address' }, { status: 400 });
  const allowed = new Set(['30s', '1m', '5m', '15m', '1h', '4h', '1d']);
  if (!allowed.has(resolution)) return Response.json({ error: 'Invalid resolution' }, { status: 400 });
  try {
    const [block, curveRaw, supplyRaw] = await Promise.all([
      rpc('eth_blockNumber', []),
      rpc('eth_call', [{ to: token, data: '0x7165485d' }, 'latest']),
      rpc('eth_call', [{ to: token, data: '0x18160ddd' }, 'latest']),
    ]);
    const curve = `0x${curveRaw.slice(-40)}`;
    const reserves = await rpc('eth_call', [{ to: curve, data: '0x0902f1ac' }, 'latest']);
    const read = (n) => BigInt(`0x${reserves.slice(2 + n * 64, 2 + (n + 1) * 64)}`);
    const eth = Number(read(0)) / 1e18; const supply = Number(BigInt(supplyRaw)) / 1e18;
    const tokens = Number(read(1)) / 1e18; const price = tokens ? eth / tokens : 0;
    const now = Math.floor(Date.now() / 1000);
    const candle = { time: now, open: price, high: price, low: price, close: price, volume: 0 };
    return Response.json({ address: token, resolution, candles: [candle], block: Number.parseInt(block, 16) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return Response.json({ error: error?.message || 'K-line unavailable' }, { status: 502 }); }
}
