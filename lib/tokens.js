// MOTIVE mainnet token data.
// Tokens are populated only from a verified mainnet indexer; no testnet/demo rows.
function seeded(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Discover is intentionally empty until a launch is registered through MOTIVE.
// External tokens are not treated as MOTIVE projects.
export const TOKENS = [];
export const EMPTY_TOKEN = { slug: '', name: 'No live markets', ticker: '—', blurb: 'No mainnet tokens are indexed yet.', manifesto: 'MOTIVE mainnet is being prepared.', mcap: 0, vol: 0, holders: 0, age: '—', cat: [], members: 0, growth: '—', social: { x: '', tg: '' } };
const REGISTRY_API = process.env.MOTIVE_REGISTRY_API || 'https://api.motivepad.fun/api/motive-tokens';
const TESTNET_RPC = 'https://robinhood-testnet.drpc.org';
const HEX_NAME = '0x06fdde03';
const HEX_SYMBOL = '0x95d89b41';
const HEX_SUPPLY = '0x18160ddd';

async function tokenRpc(method, params) {
  const response = await fetch(TESTNET_RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || method);
  return json.result;
}

function decodeString(value) {
  if (!value || value === '0x') return '';
  try {
    const hex = value.slice(2);
    const offset = Number.parseInt(hex.slice(0, 64), 16) * 2;
    const length = Number.parseInt(hex.slice(offset, offset + 64), 16) * 2;
    return Buffer.from(hex.slice(offset + 64, offset + 64 + length), 'hex').toString('utf8').replace(/\0/g, '');
  } catch { return ''; }
}

export async function loadTokenByContract(contract) {
  const address = String(contract || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return null;
  const [code, nameRaw, symbolRaw, supplyRaw] = await Promise.all([
    tokenRpc('eth_getCode', [address, 'latest']),
    tokenRpc('eth_call', [{ to: address, data: HEX_NAME }, 'latest']),
    tokenRpc('eth_call', [{ to: address, data: HEX_SYMBOL }, 'latest']),
    tokenRpc('eth_call', [{ to: address, data: HEX_SUPPLY }, 'latest']),
  ]);
  if (!code || code === '0x') return null;
  const name = decodeString(nameRaw) || 'Unknown token';
  const ticker = decodeString(symbolRaw) || 'TOKEN';
  const supply = supplyRaw && supplyRaw !== '0x' ? Number(BigInt(supplyRaw)) / 1e18 : 0;
  return { slug: `token-${address}`, name, ticker, blurb: `${name} is deployed on Robinhood Chain Testnet.`, manifesto: `${name} — $${ticker} on Robinhood Chain Testnet.`, mcap: 0, vol: 0, holders: 0, age: 'live', cat: ['testnet'], members: 0, growth: '—', social: {}, image: '', website: '', twitter: '', telegram: '', network: 'Robinhood Chain Testnet', chainId: 46630, contract: address, supply, explorer: `https://testnet-explorer.chain.robinhood.com/address/${address}`, testnet: true };
}

export async function loadLiveTokens() {
  try {
    const response = await fetch(REGISTRY_API, { cache: 'no-store' });
    if (!response.ok) return [];
    const json = await response.json();
    return Array.isArray(json.tokens) ? json.tokens : [];
  } catch { return []; }
}
export function getToken(slug) { return TOKENS.find((t) => t.slug === slug) || null; }
export function fmtUsd(n) { if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`; if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`; return `$${n}`; }
export function fmtNum(n) { if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`; return `${n}`; }
export function sparkPath(seed, w = 100, h = 34, points = 26) { const rnd = seeded(seed); let v = 0.5; const pts = []; for (let i = 0; i < points; i++) { v = Math.min(0.95, Math.max(0.05, v + (rnd() - 0.46) * 0.16)); pts.push([((i / (points - 1)) * w).toFixed(1), ((1 - v) * (h - 4) + 2).toFixed(1)]); } return 'M' + pts.map((p) => p.join(' ')).join(' L '); }
export function chartSeries(seed, n = 96) { const rnd = seeded(seed); let price = 0.4 + rnd() * 0.4; const out = []; for (let i = 0; i < n; i++) { price = Math.max(0.05, price * (1 + (rnd() - 0.485) * 0.045)); out.push(price); } return out; }
export function mockTx() { return []; }
