import fs from 'node:fs/promises';
import path from 'node:path';
import { decodeEventLog, getEventSelector, parseAbiItem } from 'viem';

export const dynamic = 'force-dynamic';
const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e'.toLowerCase();
const EVENT = parseAbiItem('event TokenLaunched(address indexed token,address indexed curve,address indexed deployer,address pairToken,uint256 launchConfigId,uint256 graduationThreshold)');
const EVENT_TOPIC = getEventSelector(EVENT).toLowerCase();
const STORE = path.join(process.cwd(), 'data', 'motive-launches.json');
const ZERO_DEPLOYER = '0x0000000000000000000000000000000000000000';
const BOOTSTRAP = [{ address: '0xbda70a84c93c9e4f30825b12706d9804be4cd55b', image: '', website: '', twitter: '', telegram: '' }];
async function readStore() { try { return JSON.parse(await fs.readFile(STORE, 'utf8')); } catch { return []; } }
async function writeStore(items) { await fs.mkdir(path.dirname(STORE), { recursive: true }); await fs.writeFile(STORE, JSON.stringify(items, null, 2)); }
async function rpc(method, params) { const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }), cache: 'no-store' }); const j = await r.json(); if (j.error) throw new Error(j.error.message || method); return j.result; }
function decodeString(raw) { if (!raw || raw === '0x') return ''; try { const h = raw.slice(2); const offset = Number.parseInt(h.slice(0, 64), 16) * 2; const len = Number.parseInt(h.slice(offset, offset + 64), 16) * 2; return Buffer.from(h.slice(offset + 64, offset + 64 + len), 'hex').toString('utf8').replace(/\0/g, ''); } catch { return ''; } }
async function tokenData(address, deployer, txHash, blockNumber, supplied = {}) { const calls = await Promise.all(['0x06fdde03', '0x95d89b41'].map((data) => rpc('eth_call', [{ to: address, data }, 'latest']))); const name = decodeString(calls[0]) || supplied.name || 'Unknown token'; const ticker = decodeString(calls[1]) || supplied.ticker || 'TOKEN'; return { slug: `token-${address.toLowerCase()}`, name, ticker, blurb: `${name} was launched through MOTIVE.`, manifesto: `${name} — $${ticker} on MOTIVE.`, mcap: 0, vol: 0, holders: 0, age: 'live', cat: ['new', 'community'], members: 0, growth: '—', social: supplied.social || {}, image: supplied.image || '', website: supplied.website || '', twitter: supplied.twitter || '', telegram: supplied.telegram || '', network: 'Robinhood Chain', chainId: 4663, contract: address.toLowerCase(), deployer: deployer.toLowerCase(), launchTx: txHash, launchBlock: blockNumber, explorer: `https://explorer.chain.robinhood.com/address/${address}` }; }
export async function GET() {
  const stored = await readStore();
  const known = new Set(stored.map((x) => x.contract?.toLowerCase()));
  const bootstrap = await Promise.all(BOOTSTRAP.filter((x) => !known.has(x.address)).map(async (x) => tokenData(x.address, ZERO_DEPLOYER, '', 0, x).catch(() => null)));
  return Response.json({ tokens: [...stored, ...bootstrap.filter(Boolean)] }, { headers: { 'cache-control': 'no-store' } });
}
export async function POST(request) {
  try {
    const body = await request.json(); const txHash = String(body.txHash || ''); const wallet = String(body.wallet || '').toLowerCase();
    if (!/^0x[0-9a-f]{64}$/i.test(txHash) || !/^0x[0-9a-f]{40}$/.test(wallet)) return Response.json({ error: 'Invalid launch receipt.' }, { status: 400 });
    const receipt = await rpc('eth_getTransactionReceipt', [txHash]); if (!receipt || receipt.status !== '0x1') return Response.json({ error: 'Launch receipt is not confirmed.' }, { status: 400 });
    const log = receipt.logs.find((item) => String(item.address).toLowerCase() === FACTORY && item.topics?.[0]?.toLowerCase() === EVENT_TOPIC);
    if (!log) return Response.json({ error: 'Receipt is not a MOTIVE launch.' }, { status: 400 });
    const decoded = decodeEventLog({ abi: [EVENT], data: log.data, topics: log.topics });
    if (String(decoded.args.deployer).toLowerCase() !== wallet) return Response.json({ error: 'Wallet does not match launch deployer.' }, { status: 403 });
    const item = await tokenData(decoded.args.token, decoded.args.deployer, txHash, Number(BigInt(receipt.blockNumber)), body);
    const items = await readStore(); const next = [...items.filter((x) => x.contract !== item.contract), item]; await writeStore(next);
    return Response.json({ token: item });
  } catch (error) { return Response.json({ error: error?.message || 'Could not register MOTIVE launch.' }, { status: 500 }); }
}
