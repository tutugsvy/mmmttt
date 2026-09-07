import { execFile } from 'node:child_process';

const TOKEN = '0xc37f9b4eb729a1833f6bbef3400ce4be203dc691';

function run(args) {
  return new Promise((resolve, reject) => {
    execFile('/root/.nvm/versions/node/v22.22.0/bin/gmgn-cli', args, { timeout: 15000, maxBuffer: 2_000_000 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || stdout || error.message));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Invalid market response')); }
    });
  });
}

export async function loadGmgnToken() {
  const data = await run(['token', 'info', '--chain', 'robinhood', '--address', TOKEN, '--raw']);
  const link = data.link || {};
  const price = data.price || {};
  return {
    source: 'live-market-indexer', address: TOKEN, name: data.name, ticker: data.symbol,
    decimals: Number(data.decimals ?? 18), logo: data.logo || '', website: link.website || '', twitter: link.twitter_username ? `https://x.com/${link.twitter_username}` : '',
    twitterUsername: link.twitter_username || '', telegram: link.telegram || '', holders: Number(data.holder_count || 0),
    priceEth: Number(price.price || 0), liquidityEth: Number(data.pool?.quote_reserve || 0),
    volume24h: Number(price.volume_24h || 0), swaps24h: Number(price.swaps_24h || 0),
    buys24h: Number(price.buys_24h || 0), sells24h: Number(price.sells_24h || 0),
    marketCapEth: Number(price.price || 0) * Number(data.circulating_supply || data.total_supply || 0),
  };
}
