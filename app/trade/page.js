'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TOKENS, chartSeries, fmtNum, fmtUsd, sparkPath } from '../../lib/tokens';
import { encodeFunctionData, parseAbi, parseEther, parseUnits } from 'viem';

const MAINNET = { chainId: '0x1237' };
const SWAP_ROUTER = '0x65050a9b7e5075a2ba5ced7b1b64ee66262c40dc';
const SWAP_POOL = '0x00a59851d5ce3c4de389ab05f68d5216193e0d85';
const NATIVE = '0x0000000000000000000000000000000000000000';
const REGISTRY_API = 'https://api.motivepad.fun/api/motive-tokens';
const QUOTE_API = 'https://api.motivepad.fun/api/quote';
const SWAP_ABI = parseAbi(['function swap((uint8,address,address,address,uint24,int24,address,bytes,address,bytes32)[] routes,address recipient,uint256 amountIn,uint256 amountOutMin,uint256 deadline)']);
const CURVE_ABI = parseAbi(['function buy(uint256 quoteIn,uint256 minTokensOut,address recipient) payable returns (uint256 tokensOut)','function sell(uint256 tokensIn,uint256 minQuoteOut,address recipient) returns (uint256 quoteOut)']);

function toHexBigInt(value, label) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  throw new Error(`${label} is invalid; wallet returned no value.`);
}

async function readTokenDecimals(provider, address) {
  const raw = await provider.request({ method: 'eth_call', params: [{ to: address, data: '0x313ce567' }, 'latest'] });
  if (typeof raw !== 'string' || !/^0x[0-9a-fA-F]+$/.test(raw)) throw new Error('Token decimals could not be read.');
  const value = Number(BigInt(raw));
  if (!Number.isInteger(value) || value < 0 || value > 36) throw new Error('Invalid token decimals.');
  return value;
}

function Chart({ seed }) {
  const [candles, setCandles] = useState([]);
  const [range, setRange] = useState('1H');
  const resolutions = { '5M': '1m', '1H': '5m', '6H': '15m', '1D': '1h', ALL: '4h' };
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/kline?resolution=${resolutions[range]}&token=${seed}`, { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((x) => { if (alive) setCandles(x?.candles || []); }).catch(() => { if (alive) setCandles([]); });
    load(); const timer = setInterval(load, 15000); return () => { alive = false; clearInterval(timer); };
  }, [seed, range]);
  const data = useMemo(() => candles.map((x) => Number(x.close)).filter(Number.isFinite).slice(-96), [candles]);
  const points = data.length > 1 ? data : [0, 1];
  const min = Math.min(...points); const max = Math.max(...points); const W = 900; const H = 280;
  const line = data.length > 1 ? 'M' + points.map((v, i) => `${((i / (points.length - 1)) * W).toFixed(1)} ${(H - ((v - min) / (max - min || 1)) * 210 - 24).toFixed(1)}`).join(' L ') : '';
  return <><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label={data.length > 1 ? 'Live indexed token price chart' : 'Waiting for indexed chart data'}><g className="grid">{[.25,.5,.75].map((f) => <line key={f} x1="0" x2={W} y1={H*f} y2={H*f} />)}</g>{line && <path className="line" d={line} />}</svg>{data.length < 2 && <p className="trade-chart-status">No indexed candles for this range yet.</p>}<div className="chart-range">{Object.keys(resolutions).map((x) => <button key={x} className={x === range ? 'on' : ''} type="button" onClick={() => setRange(x)}>{x}</button>)}</div></>;;
}

export default function TradePage() {
  const [tokens, setTokens] = useState([]);
  const [token, setToken] = useState(null);
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState(null);
  const [message, setMessage] = useState('');
  const [live, setLive] = useState(null);
  const [volume24h, setVolume24h] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [slippageMode, setSlippageMode] = useState('auto');
  const [slippage, setSlippage] = useState('1');

  useEffect(() => {
    fetch(REGISTRY_API, { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((data) => {
      const available = Array.isArray(data?.tokens) ? data.tokens : [];
      setTokens(available);
      const address = new URLSearchParams(window.location.search).get('token')?.toLowerCase();
      const selected = address ? available.find((x) => x.contract?.toLowerCase() === address) : available[0];
      if (selected) setToken(selected);
    }).catch(() => {});
    const address = new URLSearchParams(window.location.search).get('token')?.toLowerCase();
    if (address) fetch(`/api/token-live?token=${address}`, { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((data) => data && !data.error && setLive(data)).catch(() => {});
    if (address) fetch(`/api/kline?resolution=1h&token=${address}`, { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((data) => setVolume24h((data?.candles || []).slice(-24).reduce((sum, x) => sum + (Number(x.volume) || 0), 0))).catch(() => {});
  }, []);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return undefined;
    const sync = async () => {
      const chain = String(await provider.request({ method: 'eth_chainId' }).catch(() => '')).toLowerCase();
      const accounts = await provider.request({ method: 'eth_accounts' }).catch(() => []);
      setWallet(chain === MAINNET.chainId ? (accounts?.[0] || null) : null);
    };
    sync();
    provider.on?.('accountsChanged', sync);
    provider.on?.('chainChanged', sync);
    return () => { provider.removeListener?.('accountsChanged', sync); provider.removeListener?.('chainChanged', sync); };
  }, []);

  async function connect() {
    const provider = window.ethereum;
    if (!provider) return setMessage('Install a Web3 wallet first.');
    try {
      if ((await provider.request({ method: 'eth_chainId' })).toLowerCase() !== MAINNET.chainId) await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MAINNET.chainId }] });
      const accounts = await provider.request({ method: 'eth_requestAccounts' }); setWallet(accounts?.[0] || null); setMessage('');
    } catch (e) { setMessage(e?.message || 'Wallet connection failed.'); }
  }

  function setQuickAmount(percent) {
    if (!wallet) return setMessage('Connect your wallet first.');
    setBalanceLoading(true);
    const finish = () => setBalanceLoading(false);
    if (side === 'buy') {
      window.ethereum.request({ method: 'eth_getBalance', params: [wallet, 'latest'] }).then((raw) => {
        const balance = toHexBigInt(raw, 'Wallet balance');
        const spend = (balance * BigInt(percent)) / 100n;
        const gasReserve = parseEther('0.001');
        setAmount(spend > gasReserve ? String(Number(spend - gasReserve) / 1e18) : '0');
      }).catch((e) => setMessage(e?.message || 'Could not read wallet balance.')).finally(finish);
    } else {
      const data = `0x70a08231${wallet.slice(2).padStart(64, '0')}`;
      window.ethereum.request({ method: 'eth_call', params: [{ to: token.contract, data }, 'latest'] }).then((raw) => {
        const balance = toHexBigInt(raw, 'Token balance');
        const decimals = Number(live?.decimals ?? 18);
        setAmount(String(Number((balance * BigInt(percent)) / 100n) / (10 ** decimals)));
      }).catch((e) => setMessage(e?.message || 'Could not read token balance.')).finally(finish);
    }
  }

  async function submit() {
    if (!wallet) return setMessage('Connect your wallet to continue.');
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return setMessage('Enter a valid amount first.');
    const provider = window.ethereum;
    if (!provider) return setMessage('Wallet provider is unavailable. Reconnect wallet.');
    try {
      const recipient = typeof wallet === 'string' && /^0x[0-9a-fA-F]{40}$/.test(wallet) ? wallet : null;
      const tokenAddress = typeof token?.contract === 'string' && /^0x[0-9a-fA-F]{40}$/.test(token.contract) ? token.contract : null;
      if (!recipient) return setMessage('Wallet address is not ready. Reconnect wallet.');
      if (!tokenAddress) return setMessage('Token address is invalid.');
      const decimals = side === 'buy' ? 18 : await readTokenDecimals(provider, tokenAddress);
      const amountText = String(amount).trim();
      const amountIn = side === 'buy' ? parseEther(amountText) : parseUnits(amountText, decimals);
      if (amountIn <= 0n) return setMessage('Amount must be greater than zero.');
      const slippageValue = slippageMode === 'manual' ? Number(slippage) : 1;
      if (!Number.isFinite(slippageValue) || slippageValue < 0 || slippageValue > 100) return setMessage('Enter a valid slippage value.');
      setMessage('Getting live quote…');
      const quoteResponse = await fetch(QUOTE_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet: recipient, token: tokenAddress, side, amount: amountText, decimals, slippage: slippageValue }) });
      const quote = await quoteResponse.json();
      if (!quoteResponse.ok || quote?.minOutput == null) throw new Error(quote?.error || 'Live quote unavailable.');
      const minOutput = toHexBigInt(String(quote.minOutput), 'Minimum output');
      if (minOutput <= 0n) throw new Error('Quote returned zero minimum output; swap cancelled for safety.');

      const curve = typeof quote.curve === 'string' && /^0x[0-9a-fA-F]{40}$/.test(quote.curve) ? quote.curve : null;
      if (!curve) throw new Error('Quote did not return a valid Pons curve address; swap cancelled.');
      const data = encodeFunctionData({
        abi: CURVE_ABI,
        functionName: side === 'buy' ? 'buy' : 'sell',
        args: side === 'buy' ? [amountIn, minOutput, recipient] : [amountIn, minOutput, recipient],
      });
      if (side === 'sell') {
        const approval = encodeFunctionData({ abi: parseAbi(['function approve(address spender,uint256 amount) returns (bool)']), functionName: 'approve', args: [curve, amountIn] });
        setMessage('Approve token in wallet…');
        await provider.request({ method: 'eth_sendTransaction', params: [{ from: wallet, to: token.contract, data: approval }] });
      }
      const tx = { from: wallet, to: curve, data, value: side === 'buy' ? `0x${amountIn.toString(16)}` : '0x0' };
      setMessage('Checking swap simulation…');
      const gas = await provider.request({ method: 'eth_estimateGas', params: [tx] });
      if (typeof gas !== 'string' || !/^0x[0-9a-f]+$/i.test(gas)) throw new Error('Swap simulation returned no gas estimate; transaction cancelled.');
      setMessage('Confirm swap in wallet…');
      const hash = await provider.request({ method: 'eth_sendTransaction', params: [{ ...tx, gas }] });
      setMessage(`Submitted: ${hash.slice(0, 10)}…`);
    } catch (e) { setMessage(e?.message || 'Swap failed.'); }
  }

  if (!token) return <main className="page-enter"><section className="pagehead"><div className="wrap"><span className="pagehead__crumb micro micro--ink">Motive / Trade</span><h1 className="h1">Choose a token.</h1><p className="lede">Trade any token launched through MOTIVE. Select a market below or open Trade from a token page.</p>{tokens.length ? <div className="trade-market-picker">{tokens.map((item) => <button type="button" key={item.contract} onClick={() => { setToken(item); window.history.replaceState({}, '', `/trade?token=${item.contract}`); }}><span>{item.ticker}</span><b>{item.name}</b><small>{item.contract}</small></button>)}</div> : <><p className="trade-empty">No MOTIVE tokens are indexed yet.</p><Link href="/discover" className="btn btn--solid">Explore Discover →</Link></>}</div></section></main>;
  const price = live?.priceEth ? '$' + live.priceEth.toFixed(8) : (token.mcap > 0 ? '$' + (token.mcap / 1e9).toFixed(4) : '—');

  return <main className="page-enter"><div className="wrap trade-terminal">
    <div className="trade-terminal__back"><Link href={`/project/${token.slug || `token-${token.contract}`}`}>← Back to {token.name}</Link><span className="micro">Robinhood Chain · 4663</span></div>
    <div className="trade-terminal__head"><div className="trade-token">
      {live?.logo || token.image ? <img src={live?.logo || token.image} alt={`${token.name} logo`} /> : <span className="trade-token__fallback">{token.ticker?.slice(0,2)}</span>}
      <div><span className="micro">MOTIVE MARKET</span><h1>{token.name}</h1><span>${token.ticker} · {token.contract}</span></div>
    </div><div className="trade-head-actions"><label className="trade-token-select"><span className="micro">MARKET</span><select value={token.contract} onChange={(e) => { const next = tokens.find((x) => x.contract === e.target.value); if (next) { setToken(next); window.history.replaceState({}, '', `/trade?token=${next.contract}`); } }}>{tokens.map((item) => <option key={item.contract} value={item.contract}>{item.ticker} — {item.name}</option>)}</select></label><a className="btn btn--ghost" href={token.explorer} target="_blank" rel="noreferrer">Explorer ↗</a></div></div>
    <div className="trade-terminal__grid">
      <section className="trade-terminal__chart"><div className="panel-label"><span>Price</span><b>{live?.priceEth ? `${live.priceEth.toFixed(10)} ETH` : price}</b></div><Chart seed={token.contract} /><div className="terminal-stats"><div><span>Market cap</span><b>{live?.marketCapEth ? `${live.marketCapEth.toFixed(2)} ETH` : '—'}</b></div><div><span>Volume 24H</span><b>{volume24h ? `${volume24h.toFixed(2)} ETH` : '—'}</b></div><div><span>Holders</span><b>{live?.holders ?? '—'}</b></div></div></section>
      <aside className="trade-terminal__box"><div className="trade-tabs"><button className={side === 'buy' ? 'active buy' : ''} onClick={() => setSide('buy')}>Buy</button><button className={side === 'sell' ? 'active sell' : ''} onClick={() => setSide('sell')}>Sell</button></div><div className="trade-balance"><span>Wallet</span><b>{wallet ? `${wallet.slice(0,6)}…${wallet.slice(-4)}` : 'Not connected'}</b></div><label>{side === 'buy' ? 'You pay' : 'You sell'}<div className="trade-input"><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" /><span>{side === 'buy' ? 'ETH' : `$${token.ticker}`}</span></div></label><div className="quick-amounts"><button type="button" disabled={balanceLoading} onClick={() => setQuickAmount(25)}>25%</button><button type="button" disabled={balanceLoading} onClick={() => setQuickAmount(50)}>50%</button><button type="button" disabled={balanceLoading} onClick={() => setQuickAmount(75)}>75%</button><button type="button" disabled={balanceLoading} onClick={() => setQuickAmount(100)}>MAX</button></div><div className="trade-row"><span>Slippage</span><select value={slippageMode} onChange={(e) => setSlippageMode(e.target.value)}><option value="auto">Auto</option><option value="manual">Manual</option></select>{slippageMode === 'manual' && <input aria-label="Slippage percent" value={slippage} onChange={(e) => setSlippage(e.target.value.replace(/[^0-9.]/g, ''))} style={{ width: 56 }} />}</div><button className="trade-submit" onClick={wallet ? submit : connect}>{wallet ? `${side} $${token.ticker}` : 'Connect wallet'}</button>{message && <p className="trade-message">{message}</p>}</aside>
    </div>
  </div></main>;
}
