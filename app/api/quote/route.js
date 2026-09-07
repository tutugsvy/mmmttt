import { parseUnits } from 'viem';

const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const ROUTER = '0x65050a9b7e5075a2ba5ced7b1b64ee66262c40dc';
const CURVE_SELECTOR = '0x7165485d';
const CURVE_RESERVES = '0x0902f1ac';
const CURVE_FEE = '0x24a9d853';
const CURVE_TAX = '0xc1bb8901';
const CURVE_SNIPE_TAX = '0xd7e1ef39';
const TOKEN_RE = /^0x[0-9a-fA-F]{40}$/;
const NATIVE = '0x0000000000000000000000000000000000000000';

// Avoid hammering the quote provider when users double-click or retry the same
// quote. This is deliberately short-lived: a quote must never be treated as a
// permanent price.
const quoteCache = globalThis.__motiveQuoteCache || new Map();
const quoteCooldown = globalThis.__motiveQuoteCooldown || new Map();
globalThis.__motiveQuoteCache = quoteCache;
globalThis.__motiveQuoteCooldown = quoteCooldown;

function rpc(method, params) {
  return fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) }).then(async (r) => {
    const x = await r.json();
    if (x.error) throw new Error(x.error.message || 'RPC error');
    return x.result;
  });
}

function quoteConstantProduct(reserveIn, reserveOut, amountIn, feeBps = 100) {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) throw new Error('Pool has no usable liquidity.');
  const amountInWithFee = amountIn * BigInt(10000 - feeBps);
  return (amountInWithFee * reserveOut) / (reserveIn * 10000n + amountInWithFee);
}

function decodeReserves(hex) {
  if (typeof hex !== 'string' || !/^0x[0-9a-f]+$/i.test(hex) || hex.length < 2 + 64 * 2) throw new Error('Pool reserve response is invalid.');
  return [BigInt(`0x${hex.slice(2, 66)}`), BigInt(`0x${hex.slice(66, 130)}`)];
}

function word(hex, index = 0) {
  return BigInt(`0x${String(hex).slice(2 + index * 64, 2 + (index + 1) * 64) || '0'}`);
}

async function readPoolQuote({ side, token, wallet, amount, decimals, slippage }) {
  const raw = parseUnits(amount, decimals);
  const curveRaw = await rpc('eth_call', [{ to: token, data: CURVE_SELECTOR }, 'latest']);
  const curve = `0x${curveRaw.slice(-40)}`;
  if (!TOKEN_RE.test(curve) || /^0x0+$/.test(curve)) throw new Error('This token does not expose a Pons bonding curve.');
  const reserves = decodeReserves(await rpc('eth_call', [{ to: curve, data: CURVE_RESERVES }, 'latest']));
  const quoteReserve = reserves[0];
  const tokenReserve = reserves[1];
  const feeBps = Number(word(await rpc('eth_call', [{ to: curve, data: CURVE_FEE }, 'latest']).catch(() => '0x0')));
  const taxBps = Number(word(await rpc('eth_call', [{ to: curve, data: CURVE_TAX }, 'latest']).catch(() => '0x0')));
  const walletArg = wallet.slice(2).toLowerCase().padStart(64, '0');
  const snipeBps = Number(word(await rpc('eth_call', [{ to: curve, data: `${CURVE_SNIPE_TAX}${walletArg}` }, 'latest']).catch(() => '0x0')));
  const effective = BigInt(Math.max(0, 10000 - feeBps - taxBps - (side === 'buy' ? snipeBps : 0)));
  let expected;
  if (side === 'buy') {
    const net = (raw * effective) / 10000n;
    expected = (net * tokenReserve) / (quoteReserve + net);
  } else {
    const gross = (raw * quoteReserve) / (tokenReserve + raw);
    expected = (gross * BigInt(Math.max(0, 10000 - feeBps - taxBps))) / 10000n;
  }
  const minOutput = (expected * BigInt(Math.floor((100 - slippage) * 100))) / 10000n;
  if (minOutput <= 0n) throw new Error('On-chain curve quote returned zero output.');
  return { minOutput: minOutput.toString(), outputAmount: expected.toString(), rawAmount: raw.toString(), slippage, routeType: 27, route: null, curve, feeBps, taxBps, snipeBps, source: 'Pons bonding curve via Robinhood RPC', router: ROUTER };
}

export const dynamic = 'force-dynamic';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
export async function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }
export async function POST(request) {
  try {
    const body = await request.json();
    const wallet = String(body.wallet || '').toLowerCase();
    const token = String(body.token || '').toLowerCase();
    const side = body.side === 'sell' ? 'sell' : 'buy';
    const amount = String(body.amount || '');
    const slippage = Number(body.slippage);
    if (!TOKEN_RE.test(wallet) || !TOKEN_RE.test(token) || !/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) return Response.json({ error: 'Invalid quote parameters' }, { status: 400, headers: cors });
    if (!Number.isFinite(slippage) || slippage < 0 || slippage > 100) return Response.json({ error: 'Invalid slippage' }, { status: 400, headers: cors });
    const input = side === 'buy' ? NATIVE : token;
    const output = side === 'buy' ? token : NATIVE;
    const decimals = side === 'buy' ? 18 : Number(body.decimals ?? 18);
    const rawAmount = parseUnits(amount, decimals).toString();
    const key = [wallet, token, side, rawAmount, slippage].join(':');
    const now = Date.now();
    // Do not reuse a reserve quote: this is a live swap quote and must be
    // generated from the latest RPC state immediately before simulation.
    const cached = null;
    if (cached && cached.expires > now) return Response.json(cached.value, { headers: { ...cors, 'cache-control': 'no-store', 'x-quote-cache': 'hit' } });
    const active = quoteCooldown.get(key);
    if (active && active.expires > now) return Response.json({ error: 'A quote for this amount is already being requested. Wait a moment before retrying.' }, { status: 429, headers: cors });
    quoteCooldown.set(key, { expires: now + 5000 });
    try {
      const value = await readPoolQuote({ side, token, wallet, amount, decimals, slippage });
      quoteCache.set(key, { value, expires: Date.now() + 3000 });
      return Response.json(value, { headers: { ...cors, 'cache-control': 'no-store', 'x-quote-cache': 'miss' } });
    } finally { quoteCooldown.delete(key); }
  } catch (error) {
    const message = error?.message || 'Quote unavailable';
    const rateLimited = /429|RATE_LIMIT|RATE_LIMIT_BANNED|rate limit/i.test(message);
    return Response.json({ error: rateLimited ? 'On-chain Robinhood RPC is temporarily rate-limited. No swap was submitted.' : message }, { status: rateLimited ? 429 : 502, headers: cors });
  }
}
