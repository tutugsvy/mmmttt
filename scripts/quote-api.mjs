import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 4392);
const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const CURVE_SELECTOR = '0x7165485d';
const CURVE_RESERVES = '0x0902f1ac';
const CURVE_FEE = '0x24a9d853';
const CURVE_TAX = '0xc1bb8901';
const CURVE_SNIPE_TAX = '0xd7e1ef39';
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const NATIVE = '0x0000000000000000000000000000000000000000';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };

function json(res, status, body) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...cors }); res.end(JSON.stringify(body)); }
function word(hex, index = 0) { return BigInt(`0x${String(hex).slice(2 + index * 64, 2 + (index + 1) * 64) || '0'}`); }
function reserves(hex) { if (typeof hex !== 'string' || !/^0x[0-9a-f]+$/i.test(hex) || hex.length < 258) throw new Error('Curve reserves response is invalid.'); return [word(hex, 0), word(hex, 1)]; }
async function rpc(method, params) { const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) }); const j = await r.json(); if (j.error) throw new Error(j.error.message || 'RPC error'); return j.result; }
function parseUnits(value, decimals) { const [whole, fraction = ''] = String(value).split('.'); if (!/^\d+$/.test(whole) || fraction && !/^\d+$/.test(fraction) || fraction.length > decimals) throw new Error('Invalid amount.'); return BigInt(whole) * (10n ** BigInt(decimals)) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0'); }
async function quote(body) {
  const wallet = String(body.wallet || '').toLowerCase(); const token = String(body.token || '').toLowerCase(); const side = body.side === 'sell' ? 'sell' : 'buy'; const amount = String(body.amount || ''); const slippage = Number(body.slippage); const decimals = side === 'buy' ? 18 : Number(body.decimals ?? 18);
  if (!ADDRESS.test(wallet) || !ADDRESS.test(token) || !/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) throw new Error('Invalid quote parameters');
  if (!Number.isFinite(slippage) || slippage < 0 || slippage > 100) throw new Error('Invalid slippage');
  const raw = parseUnits(amount, decimals); const curveRaw = await rpc('eth_call', [{ to: token, data: CURVE_SELECTOR }, 'latest']); const curve = `0x${curveRaw.slice(-40)}`;
  if (!ADDRESS.test(curve) || /^0x0+$/.test(curve)) throw new Error('This token does not expose a Pons bonding curve.');
  const [quoteReserve, tokenReserve] = reserves(await rpc('eth_call', [{ to: curve, data: CURVE_RESERVES }, 'latest']));
  const feeBps = Number(word(await rpc('eth_call', [{ to: curve, data: CURVE_FEE }, 'latest']).catch(() => '0x0')));
  const taxBps = Number(word(await rpc('eth_call', [{ to: curve, data: CURVE_TAX }, 'latest']).catch(() => '0x0')));
  const snipeBps = Number(word(await rpc('eth_call', [{ to: curve, data: `${CURVE_SNIPE_TAX}${wallet.slice(2).padStart(64, '0')}` }, 'latest']).catch(() => '0x0')));
  const effective = BigInt(Math.max(0, 10000 - feeBps - taxBps - (side === 'buy' ? snipeBps : 0))); let expected;
  if (side === 'buy') { const net = (raw * effective) / 10000n; expected = (net * tokenReserve) / (quoteReserve + net); }
  else { const gross = (raw * quoteReserve) / (tokenReserve + raw); expected = (gross * BigInt(Math.max(0, 10000 - feeBps - taxBps))) / 10000n; }
  const minOutput = (expected * BigInt(Math.floor((100 - slippage) * 100))) / 10000n; if (minOutput <= 0n) throw new Error('On-chain curve quote returned zero output.');
  return { minOutput: minOutput.toString(), outputAmount: expected.toString(), rawAmount: raw.toString(), slippage, curve, feeBps, taxBps, snipeBps, source: 'Pons bonding curve via Robinhood RPC' };
}
function body(req) { return new Promise((resolve, reject) => { let data = ''; req.on('data', (x) => { data += x; if (data.length > 100000) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); }); }
const server = http.createServer(async (req, res) => { const url = new URL(req.url, `http://${req.headers.host}`); if (req.method === 'OPTIONS') return json(res, 204, {}); if (req.method !== 'POST' || url.pathname !== '/api/quote') return json(res, 404, { error: 'Not found' }); try { return json(res, 200, await quote(await body(req))); } catch (e) { return json(res, /Invalid/.test(e.message) ? 400 : 502, { error: e.message || 'Quote unavailable' }); } });
server.listen(PORT, '127.0.0.1', () => console.log(`MOTIVE quote API listening on 127.0.0.1:${PORT}`));
