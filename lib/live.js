const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const DEFAULT_TOKEN = '0xc37f9b4eb729a1833f6bbef3400ce4be203dc691';

async function rpc(method, params) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message || method); return j.result;
}
function word(hex, n) { return BigInt(`0x${hex.slice(2 + n * 64, 2 + (n + 1) * 64)}`); }
function addressTopic(x) { return `0x${x.slice(-40)}`.toLowerCase(); }

export async function loadTokenLive(tokenAddress = DEFAULT_TOKEN) {
  const token = String(tokenAddress || DEFAULT_TOKEN).toLowerCase();
  const head = await rpc('eth_blockNumber', []);
  const [supply, decimals, curveRaw, logs] = await Promise.all([
    rpc('eth_call', [{ to: token, data: '0x18160ddd' }, 'latest']),
    rpc('eth_call', [{ to: token, data: '0x313ce567' }, 'latest']).catch(() => '0x12'),
    rpc('eth_call', [{ to: token, data: '0x7165485d' }, 'latest']),
    rpc('eth_getLogs', [{ address: token, fromBlock: `0x${(Number.parseInt(head, 16) - 5000).toString(16)}`, toBlock: 'latest', topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'] }]).catch(() => []),
  ]);
  const curve = `0x${curveRaw.slice(-40)}`;
  const reserves = await rpc('eth_call', [{ to: curve, data: '0x0902f1ac' }, 'latest']).catch(() => '0x');
  const r0 = reserves.length >= 130 ? Number(word(reserves, 0)) / 1e18 : 0;
  const r1 = reserves.length >= 130 ? Number(word(reserves, 1)) / 1e18 : 0;
  const tokenDecimals = Number(BigInt(decimals));
  const supplyNum = Number(BigInt(supply)) / (10 ** tokenDecimals);
  const tokenReserve = r1; const ethReserve = r0;
  const priceEth = tokenReserve ? ethReserve / tokenReserve : 0;
  const holders = new Set(); logs.forEach((x) => { if (x.topics?.[2]) holders.add(addressTopic(x.topics[2])); });
  return { pair: curve, block: Number.parseInt(head, 16), liquidityEth: ethReserve, tokenReserve, priceEth, marketCapEth: priceEth * supplyNum, supply: supplyNum, holders: holders.size, activity: logs.slice(-20).reverse().map((x) => ({ tx: x.transactionHash, block: Number.parseInt(x.blockNumber, 16), sender: x.topics?.[1] ? addressTopic(x.topics[1]) : '—' })) };
}
