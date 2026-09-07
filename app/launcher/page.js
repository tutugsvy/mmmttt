'use client';

import { useEffect, useRef, useState } from 'react';
import { encodeFunctionData, parseAbi, parseEther, parseUnits } from 'viem';

const CHAIN_ID = '0x1237';
const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
const PERIPHERY = '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948';
const ZERO = '0x0000000000000000000000000000000000000000';
const ASSETS = [
  ['ETH','Ether',18,true,ZERO], ['cbBTC','Coinbase Wrapped BTC',8,false,'0xCEC185eB182c47d1bA1EFc84e6959e18cd620Be4'], ['USDG','Global Dollar',6,false,'0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'],
  ['NVDA','NVIDIA',18,false,'0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC'], ['SPCX','SpaceX Class A',18,false,'0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa'], ['GOOGL','Alphabet Class A',18,false,'0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3'], ['TSLA','Tesla',18,false,'0x322F0929c4625eD5bAd873c95208D54E1c003b2d'], ['GME','GameStop',18,false,'0x1b0E319c6A659F002271B69dB8A7df2F911c153E'], ['AAPL','Apple',18,false,'0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9'], ['SPY','SPDR S&P 500 ETF',18,false,'0x117cc2133c37B721F49dE2A7a74833232B3B4C0C'],
  ['SNDK','SanDisk',18,false,'0xB90A19fF0Af67f7779afF50A882A9CfF42446400'], ['AMD','Advanced Micro Devices',18,false,'0x86923f96303D656E4aa86D9d42D1e57ad2023fdC'], ['AMZN','Amazon',18,false,'0x12f190a9F9d7D37a250758b26824B97CE941bF54'], ['MSFT','Microsoft',18,false,'0xe93237C50D904957Cf27E7B1133b510C669c2e74'], ['META','Meta Platforms',18,false,'0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35'], ['CRCL','Circle Internet Group',18,false,'0xdF0992E440dD0be65BD8439b609d6D4366bf1CB5'], ['COIN','Coinbase',18,false,'0x6330D8C3178a418788dF01a47479c0ce7CCF450b'], ['MU','Micron Technology',18,false,'0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD'], ['PLTR','Palantir Technologies',18,false,'0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A'], ['TTWO','Take-Two Interactive',18,false,'0x5e81213613b6B86EaB4c6c50d718d34359459786'], ['RIVN','Rivian Automotive',18,false,'0xB1BF26c1D20ff267A4f93550d1E0d06ac40a114B'], ['COST','Costco',18,false,'0x4EA005168D7F09a7A0Ba9D1DEf21a479950E44C2'], ['DJT','Trump Media & Technology Group',18,false,'0x1D11f0496982706C5e14A514D4E79F2e6BdE4516'], ['MSTR','Strategy',18,false,'0xec262a75e413fAfD0dF80480274532C79D42da09'], ['QQQ','Invesco QQQ',18,false,'0xD5f3879160bc7c32ebb4dC785F8a4F505888de68'], ['RDDT','Reddit',18,false,'0x05b37Fb53A299a1b874A619e1c4C404D52C36F4C'], ['HIMS','Hims & Hers Health',18,false,'0xCceE82fE024c36fA15E1005edE3E9e4787e23D09'], ['BB','BlackBerry',18,false,'0x48E39E56aCdbA37b09020C0b734A613C9a2f100A'], ['GLD','SPDR Gold Shares',18,false,'0xC9a981FEE1F9DEc688bb123ccDeCc63D0deBFC4e'], ['LLY','Eli Lilly',18,false,'0x8005d266423c7ea827372c9c864491e5786600ea'], ['WYFI','WhiteFiber',18,false,'0x9e7ABD3C9139D14E4c86DcE0e455AAB7A0C2FB3E'], ['TSM','Taiwan Semiconductor',18,false,'0x58FfE4a942d3885bAa22D7520691F611EF09e7AA'], ['RBLX','Roblox',18,false,'0xF0C4BF4C582cb3836e98394b1d4e7B7281101bE8'], ['SKHY','SK hynix',18,false,'0x84CAb63bc87912E71ad199ff14A0bA45de68FeF8'], ['DELL','Dell Technologies',18,false,'0x941AE714EC6D8130c7B75d67160Ca08f1e7d11Dd'], ['USO','United States Oil Fund',18,false,'0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344'], ['SNAP','Snap',18,false,'0xF6589F11Bc40b669e584073F428B05562F568733'], ['LULU','Lululemon',18,false,'0x4e62068525Ab11FE768e29dfD00ef909B9803016'], ['FIG','Figma',18,false,'0x41F4267525a8AFf329540eF24fD83d9044758B33'], ['MRNA','Moderna',18,false,'0x43B07D15cE533bEc5476d70C22a78a1B2B662155'], ['PFE','Pfizer',18,false,'0x7066A64c24e4206CD62E83bf198c1E7EB361F51e'], ['MRVL','Marvell Technology',18,false,'0x62fd0668e10D8B72339BE2DCF7643001688ff13B'], ['JNJ','Johnson & Johnson',18,false,'0x03DfbBE0AC4E7bCDaFd08eD41A400326B77D8c80'], ['AMC','AMC Entertainment',18,false,'0x05a3d1Cd21d0C88145E82600E62e7E496e0F222B'], ['SGOV','iShares 0-3M Treasury ETF',18,false,'0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5'], ['BABA','Alibaba',18,false,'0xad25Ac6C84D497db898fa1E8387bf6Af3532a1c4'], ['INDA','iShares MSCI India ETF',18,false,'0xACEF2e09adb47aD6aBeBAD9fF06689E60615C2B6'], ['IBM','IBM',18,false,'0x980dcf6766FA79f5Cf0c4AAdb3ab477ff15a9619'], ['NFLX','Netflix',18,false,'0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8'], ['BULL','Webull',18,false,'0xceF9027c7d6985b85f0BA431125073529A947A68'], ['NU','Nu Holdings',18,false,'0x408c14038a04f7bD235329E26d2bf569ee20e250'], ['SLV','iShares Silver Trust',18,false,'0x411eFb0E7f985935DAec3D4C3ebaEa0d0AD7D89f'], ['SHOP','Shopify',18,false,'0xF53F66751B1Eff985311b693531E3290F600c410'], ['BE','Bloom Energy',18,false,'0x822CC93fFD030293E9842c30BBD678F530701867'], ['F','Ford Motor',18,false,'0x25C288E6D899b9BC30160965aD9644c67e73bE0C'], ['UPS','United Parcel Service',18,false,'0xf23250dac154D05Bb671CB0d0eBEf3c635c79CE2'],
].map(([symbol,name,dec,native,address]) => ({ symbol,name,dec,native,address }));
const DEFAULT_ASSET = ASSETS[0];
const ABI = parseAbi([
  'function launchFee() view returns (uint256)',
  'function approvedPairTokens(address pairToken) view returns (bool)',
  'function launchToken((string name,string symbol,string logo,string description,(string twitter,string telegram,string discord,string website,string farcaster) socials,address creatorFeeRecipient,uint16 creatorTaxBps,bool buybackEnabled,bytes32 expectedEconomics,bytes32 salt) params,uint256 launchConfigId,address pairToken,address[] snipeTaxExemptions) payable returns (address token,address curve)',
  'function previewLaunchEconomics(uint256 launchConfigId,address pairToken) view returns (bytes32)',
  'function allowance(address owner,address spender) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function launchAndBuy((string name,string symbol,string logo,string description,(string twitter,string telegram,string discord,string website,string farcaster) socials,address creatorFeeRecipient,uint16 creatorTaxBps,bool buybackEnabled,bytes32 expectedEconomics,bytes32 salt) params,uint256 launchConfigId,address pairToken,uint256 quoteIn,uint256 minTokensOut,address recipient,address[] snipeTaxExemptions) payable returns (address token,address curve,uint256 tokensOut)',
]);

function clean(value) { return String(value || '').trim(); }
function addr(value) { return /^0x[0-9a-fA-F]{40}$/.test(value) ? value : null; }
function errorText(error) { return error?.shortMessage || error?.message || 'Launch failed.'; }

export default function LauncherPage() {
  const [wallet, setWallet] = useState('');
  const [form, setForm] = useState({ name: '', ticker: '', description: '', logo: '', x: '', telegram: '', discord: '', website: '', farcaster: '', pair: DEFAULT_ASSET.symbol, buy: '', tax: '1', feeWallet: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoStatus, setLogoStatus] = useState('');
  const [status, setStatus] = useState('Connect Wallet in the header to begin.');
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [balances, setBalances] = useState({ eth: null, asset: null });
  const inputRef = useRef(null);

  const update = (key, value) => setForm((x) => ({ ...x, [key]: value }));
  const connected = Boolean(addr(wallet));
  const selectedAsset = ASSETS.find((item) => item.symbol === form.pair) || DEFAULT_ASSET;

  useEffect(() => {
    const p = window.ethereum;
    if (!p || !connected) { setBalances({ eth: null, asset: null }); return undefined; }
    let active = true;
    async function readBalances() {
      const ethRaw = await p.request({ method: 'eth_getBalance', params: [wallet, 'latest'] });
      const raw = selectedAsset.native ? ethRaw : await p.request({ method: 'eth_call', params: [{ to: selectedAsset.address, data: encodeFunctionData({ abi: ABI, functionName: 'balanceOf', args: [wallet] }) }, 'latest'] });
      if (active) setBalances({ eth: Number(BigInt(ethRaw)) / 1e18, asset: Number(BigInt(raw)) / (10 ** selectedAsset.dec) });
    }
    readBalances().catch(() => setBalances({ eth: null, asset: null }));
    return () => { active = false; };
  }, [connected, wallet, selectedAsset.symbol]);

  useEffect(() => {
    const p = window.ethereum;
    if (!p) return undefined;
    const refresh = async () => {
      const accounts = await p.request({ method: 'eth_accounts' }).catch(() => []);
      const chain = String(await p.request({ method: 'eth_chainId' }).catch(() => '')).toLowerCase();
      const account = accounts?.[0] || '';
      setWallet(chain === CHAIN_ID ? account : '');
      if (account && chain !== CHAIN_ID) setStatus('Switch the connected wallet to Robinhood Chain · 4663.');
      else if (!account) setStatus('Connect Wallet in the header to begin.');
    };
    refresh();
    const onAccounts = () => refresh();
    const onChain = () => refresh();
    p.on?.('accountsChanged', onAccounts); p.on?.('chainChanged', onChain);
    return () => { p.removeListener?.('accountsChanged', onAccounts); p.removeListener?.('chainChanged', onChain); };
  }, []);

  async function uploadLogo(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setLogoStatus('Use PNG, JPG, or WEBP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setLogoStatus('Image must be under 5 MB.'); return; }
    setLogoFile(file); setLogoStatus('Uploading to IPFS…');
    try {
      const body = new FormData(); body.append('image', file, file.name);
      const response = await fetch('/api/upload', { method: 'POST', body });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.uri) throw new Error(json.error || `Upload failed (HTTP ${response.status})`);
      update('logo', json.uri); setLogoStatus(`Image ready · ${json.uri.slice(0, 25)}…`);
    } catch (error) { setLogoFile(null); setLogoStatus(errorText(error)); }
  }

  async function build() {
    const p = window.ethereum; const account = addr(wallet);
    if (!p || !account) throw new Error('Connect Wallet in the header first.');
    if (!clean(form.name) || !clean(form.ticker)) throw new Error('Name and ticker are required.');
    if (!clean(form.logo)) throw new Error('Upload a token logo first.');
    const asset = ASSETS.find((item) => item.symbol === form.pair) || DEFAULT_ASSET;
    // The proven launcher flow uses launchAndBuy and the contract rejects a
    // zero quoteIn. Keep this required even though the visual label is compact.
    if (!clean(form.buy) || Number(form.buy) <= 0) throw new Error(`Creator initial buy must be greater than zero (${asset.symbol}).`);
    const buy = parseUnits(clean(form.buy), asset.dec);
    const taxNumber = Number(form.tax || 0); if (!Number.isFinite(taxNumber) || taxNumber < 0 || taxNumber > 10) throw new Error('Creator tax must be between 0 and 10%.');
    const feeWallet = addr(clean(form.feeWallet)) || account;
    const approvedRaw = asset.native ? '0x1' : await p.request({ method: 'eth_call', params: [{ to: FACTORY, data: encodeFunctionData({ abi: ABI, functionName: 'approvedPairTokens', args: [asset.address] }) }, 'latest'] });
    const [economicsRaw, launchFeeRaw] = await Promise.all([
      p.request({ method: 'eth_call', params: [{ to: FACTORY, data: encodeFunctionData({ abi: ABI, functionName: 'previewLaunchEconomics', args: [0n, asset.address] }) }, 'latest'] }),
      p.request({ method: 'eth_call', params: [{ to: FACTORY, data: encodeFunctionData({ abi: ABI, functionName: 'launchFee' }) }, 'latest'] }),
    ]);
    if (BigInt(approvedRaw) !== 1n) throw new Error(`${asset.symbol} is not an approved paired asset.`);
    const economics = economicsRaw;
    const launchFee = BigInt(launchFeeRaw);
    const salt = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, '0')).join('')}`;
    const params = [clean(form.name), clean(form.ticker).replace(/^\$/, '').slice(0, 12), clean(form.logo), clean(form.description), [clean(form.x), clean(form.telegram), clean(form.discord), clean(form.website), clean(form.farcaster)], feeWallet, BigInt(Math.round(taxNumber * 100)), false, economics, salt];
    const data = encodeFunctionData({ abi: ABI, functionName: 'launchAndBuy', args: [params, 0n, asset.address, buy, 0n, account, []] });
    return { account, data, target: PERIPHERY, value: asset.native ? launchFee + buy : launchFee, asset, buy };
  }

  async function launch() {
    if (!connected || busy) return;
    setBusy(true); setTxHash(''); setStatus('Preparing launch transaction…');
    try {
      const p = window.ethereum; const built = await build();
      if (!built.asset.native) {
        const allowanceRaw = await p.request({ method: 'eth_call', params: [{ to: built.asset.address, data: encodeFunctionData({ abi: ABI, functionName: 'allowance', args: [built.account, PERIPHERY] }) }, 'latest'] });
        if (BigInt(allowanceRaw) < built.buy) {
          setStatus(`Approve ${built.asset.symbol} in your wallet…`);
          const approveData = encodeFunctionData({ abi: ABI, functionName: 'approve', args: [PERIPHERY, built.buy] });
          const approvalHash = await p.request({ method: 'eth_sendTransaction', params: [{ from: built.account, to: built.asset.address, data: approveData }] });
          setStatus('Approval submitted. Waiting for approval confirmation…');
          for (let i = 0; i < 90; i += 1) {
            const approvalReceipt = await p.request({ method: 'eth_getTransactionReceipt', params: [approvalHash] });
            if (approvalReceipt) { if (approvalReceipt.status !== '0x1') throw new Error('Asset approval reverted.'); break; }
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }
      const tx = { from: built.account, to: built.target, data: built.data, value: `0x${built.value.toString(16)}` };
      const gas = await p.request({ method: 'eth_estimateGas', params: [tx] });
      const hash = await p.request({ method: 'eth_sendTransaction', params: [{ ...tx, gas }] });
      setTxHash(hash); setStatus('Launch submitted. Waiting for confirmation…');
      let receipt = null;
      for (let i = 0; i < 90 && !receipt; i += 1) { await new Promise((resolve) => setTimeout(resolve, 2000)); receipt = await p.request({ method: 'eth_getTransactionReceipt', params: [hash] }); }
      if (!receipt) setStatus(`Transaction pending: ${hash}`);
      else if (receipt.status === '0x1') {
        setStatus('Token launched. Registering it in MOTIVE Discover…');
        const registration = await fetch('/api/motive-tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ txHash: hash, wallet: built.account, name: form.name, ticker: form.ticker, website: form.website, twitter: form.x, telegram: form.telegram, image: form.logo }) });
        const registered = await registration.json().catch(() => ({}));
        setStatus(registration.ok ? 'Token launched and added to MOTIVE Discover.' : `Token launched, but Discover registration failed: ${registered.error || 'try again later'}`);
      }
      else setStatus('Launch transaction reverted.');
    } catch (error) { setStatus(errorText(error)); }
    finally { setBusy(false); }
  }

  const field = (key, label, placeholder = '') => <label className="launch-field"><span>{label}</span><input disabled={!connected || busy} value={form[key]} placeholder={placeholder} onChange={(e) => update(key, e.target.value)} /></label>;
  return <main className="page-enter"><section className="pagehead"><div className="wrap"><span className="pagehead__crumb micro micro--ink">Motive / Launcher</span><h1 className="h1">Make an idea tradeable.</h1><p className="lede">Create a token for your community on MOTIVE. Connect your wallet, shape the identity, choose its paired market, and launch.</p></div></section>
    <section className="launch"><div className="wrap"><div className="launch-grid">
      <div className={`live launch-card${connected ? '' : ' launch-card--locked'}`}>
        <div className="panel-label"><span>Wallet session</span><b>{connected ? `${wallet.slice(0, 8)}…${wallet.slice(-6)}` : 'Connect Wallet in header'}</b></div>
        <div className="launch-lock">{connected ? `Wallet connected · Robinhood Chain 4663 · ${balances.eth === null ? 'ETH balance loading…' : `${balances.eth.toFixed(4)} ETH available`}` : 'Use the single Connect Wallet button in the header. This form unlocks automatically.'}</div>
        <h2>Token</h2>{field('name', 'Name *', 'Your token name')}{field('ticker', 'Ticker *', '$TICKER')}{field('description', 'Description', 'What is this token about?')}
        <label className="launch-field"><span>Logo * <em>PNG, JPG or WEBP · max 5 MB</em></span><input ref={inputRef} disabled={!connected || busy} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadLogo(e.target.files?.[0])} /></label>{logoFile && <p className="logo-upload-status">{logoStatus}</p>}
        <h2>Socials</h2>{field('x', 'X', '@handle or https://x.com/...')}{field('telegram', 'Telegram', '@channel or https://t.me/...')}{field('discord', 'Discord')}{field('website', 'Website', 'https://your-site.xyz')}{field('farcaster', 'Farcaster')}
        <h2>Economics</h2><label className="launch-field"><span>Paired asset <em>— what your token trades against</em></span><select disabled={!connected || busy} value={form.pair} onChange={(e) => { const next = ASSETS.find((item) => item.symbol === e.target.value) || DEFAULT_ASSET; update('pair', next.symbol); update('buy', next.symbol === 'ETH' ? '0.05' : next.symbol === 'USDG' ? '100' : next.symbol === 'cbBTC' ? '0.001' : '1'); }}><option value="ETH">ETH — Ether</option>{ASSETS.slice(1).map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.symbol} — {asset.name} (asset)</option>)}</select></label>{field('buy', `Creator initial buy (${selectedAsset.symbol}) *`, selectedAsset.symbol === 'ETH' ? '0.05' : '1')}{connected && <p className="logo-upload-status">{selectedAsset.symbol} balance: {balances.asset === null ? 'loading…' : balances.asset.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>}{field('tax', 'Creator tax % (0–10)', '1')}{field('feeWallet', 'Fee wallet — blank = your address', '0x...')}
        <div className="launch-actions"><button className="btn btn--solid launch-primary" onClick={launch} disabled={!connected || busy}>{busy ? 'Launching…' : 'Launch token'}</button></div><p className="trade-message">{status}</p>{txHash && <a className="launch-tx" href={`https://explorer.chain.robinhood.com/tx/${txHash}`} target="_blank" rel="noreferrer">View transaction ↗</a>}
      </div>
      <aside className="live launch-card"><div className="panel-label"><span>Token preview</span><b>{form.ticker ? `$${clean(form.ticker).replace(/^\$/, '').toUpperCase()}` : 'YOUR TOKEN'}</b></div><div className="launch-token-preview">{form.logo ? <img src={form.logo.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${form.logo.slice(7)}` : form.logo} alt="Token logo preview" /> : <div className="launch-token-preview__empty">+</div>}<h2>{form.name || 'Your token name'}</h2><p>{form.description || 'Your token description will appear here.'}</p></div><div className="launch-preview"><h2>Launch summary</h2><div><span>Paired with</span><b>{selectedAsset.symbol}</b></div><div><span>Network</span><b>Robinhood Chain</b></div><p className="micro">MOTIVE launch · wallet-signed · IPFS metadata</p></div></aside>
    </div></div></section></main>;
}
