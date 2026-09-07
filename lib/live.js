const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const TOKEN = '0xc37f9b4eb729a1833f6bbef3400ce4be203dc691';
const GMGN_TOKEN = '0xc37f9b4eb729a1833f6bbef3400ce4be203dc691';
const GMGN_CHAIN = 'robinhood';
const WETH = '0x0bd7d308f8e1639fab988df18a8011f41eacad73';
const PAIR = '0x00a59851d5ce3c4de389ab05f68d5216193e0d85';
const SWAP_TOPIC = '0x8113d738abdcb6b38357e9d53a54a7157861a09031b453651f0fe7fe151f59df';

async function rpc(method, params) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || method);
  return j.result;
}
function word(hex, n) { return BigInt(`0x${hex.slice(2 + n * 64, 2 + (n + 1) * 64)}`); }
function addressTopic(x) { return `0x${x.slice(-40)}`.toLowerCase(); }
export async function loadTokenLive() {
  const [head, supply, reserves, logs] = await Promise.all([
    rpc('eth_blockNumber', []),
    rpc('eth_call', [{ to: TOKEN, data: '0x18160ddd' }, 'latest']),
    rpc('eth_call', [{ to: PAIR, data: '0x0902f1ac' }, 'latest']),
    rpc('eth_getLogs', [{ address: PAIR, fromBlock: `0x${(Number.parseInt(await rpc('eth_blockNumber', []), 16) - 5000).toString(16)}`, toBlock: 'latest', topics: [SWAP_TOPIC] }]),
  ]);
  const r0 = Number(word(reserves, 0)) / 1e18; const r1 = Number(word(reserves, 1)) / 1e18;
  const tokenIs0 = TOKEN.toLowerCase() < WETH.toLowerCase();
  const tokenReserve = tokenIs0 ? r0 : r1; const ethReserve = tokenIs0 ? r1 : r0;
  const supplyNum = Number(BigInt(supply)) / 1e18;
  const priceEth = tokenReserve ? ethReserve / tokenReserve : 0;
  const mcapEth = priceEth * supplyNum;
  return { pair: PAIR, block: Number.parseInt(head, 16), liquidityEth: ethReserve, tokenReserve, priceEth, marketCapEth: mcapEth, supply: supplyNum, activity: logs.slice(-20).reverse().map((x) => ({ tx: x.transactionHash, block: Number.parseInt(x.blockNumber, 16), sender: x.topics?.[1] ? addressTopic(x.topics[1]) : '—' })) };
}
