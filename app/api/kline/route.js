import { execFile } from 'node:child_process';

const TOKEN = '0xc37f9b4eb729a1833f6bbef3400ce4be203dc691';
const BIN = '/root/.nvm/versions/node/v22.22.0/bin/gmgn-cli';

function run(args) {
  return new Promise((resolve, reject) => execFile(BIN, args, { timeout: 20000, maxBuffer: 2_000_000 }, (error, stdout, stderr) => {
    if (error) return reject(new Error(stderr || stdout || error.message));
    try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Invalid K-line response')); }
  }));
}

export const dynamic = 'force-dynamic';
export async function GET(request) {
  const resolution = new URL(request.url).searchParams.get('resolution') || '5m';
  const allowed = new Set(['30s', '1m', '5m', '15m', '1h', '4h', '1d']);
  if (!allowed.has(resolution)) return Response.json({ error: 'Invalid resolution' }, { status: 400 });
  try {
    const result = await run(['market', 'kline', '--chain', 'robinhood', '--address', TOKEN, '--resolution', resolution, '--raw']);
    return Response.json({ address: TOKEN, resolution, candles: result.list || [] }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return Response.json({ error: error?.message || 'K-line unavailable' }, { status: 502 }); }
}
