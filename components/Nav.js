'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/launcher', label: 'Launcher' },
  { href: '/discover', label: 'Discover' },
  { href: '/trade', label: 'Trade' },
  { href: '/community', label: 'Community' },
];

const RH = {
  chainId: '0x1237',
  chainName: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
  blockExplorerUrls: ['https://explorer.chain.robinhood.com'],
};

function short(a) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ''; }
function eth(wei) { return Number(wei) / 1e18; }

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [wrongChain, setWrongChain] = useState(false);
  const [error, setError] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    const provider = window.ethereum;
    if (!provider) return undefined;
    const refresh = async () => {
      const accounts = await provider.request({ method: 'eth_accounts' }).catch(() => []);
      const chain = await provider.request({ method: 'eth_chainId' }).catch(() => '');
      setWallet(accounts[0] || null);
      setWrongChain(Boolean(accounts[0] && chain.toLowerCase() !== RH.chainId));
      if (accounts[0] && chain.toLowerCase() === RH.chainId) {
        const raw = await provider.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] }).catch(() => null);
        setBalance(raw ? eth(parseInt(raw, 16)).toFixed(4) : null);
      } else setBalance(null);
    };
    refresh();
    const accountChanged = () => refresh();
    const chainChanged = () => refresh();
    provider.on?.('accountsChanged', accountChanged);
    provider.on?.('chainChanged', chainChanged);
    return () => {
      provider.removeListener?.('accountsChanged', accountChanged);
      provider.removeListener?.('chainChanged', chainChanged);
    };
  }, [pathname]);

  async function ensureRobinhood(provider) {
    const chain = await provider.request({ method: 'eth_chainId' });
    if (chain.toLowerCase() === RH.chainId) return true;
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: RH.chainId }] });
    } catch (switchError) {
      if (switchError?.code !== 4902) throw switchError;
      await provider.request({ method: 'wallet_addEthereumChain', params: [RH] });
      const afterAdd = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
      if (afterAdd !== RH.chainId) await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: RH.chainId }] });
    }
    const active = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
    if (active !== RH.chainId) throw new Error('Wallet is not on Robinhood Chain mainnet (4663).');
    return true;
  }

  async function connect() {
    const provider = window.ethereum;
    setError('');
    if (!provider) {
      setError('Install MetaMask, Rabby, or another Web3 wallet.');
      return;
    }
    if (wallet) {
      setWallet(null); setBalance(null); return;
    }
    try {
      await ensureRobinhood(provider);
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const account = accounts?.[0];
      if (account) {
        setWallet(account);
        const raw = await provider.request({ method: 'eth_getBalance', params: [account, 'latest'] });
        setBalance(eth(parseInt(raw, 16)).toFixed(4));
        setWrongChain(false);
      }
    } catch (e) {
      setError(e?.message || 'Wallet connection was rejected.');
    }
  }

  return (
    <header className="nav">
      <div className="wrap nav__inner">
        <Link href="/" className="nav__logo" aria-label="MOTIVE — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/motive.png" alt="MOTIVE" className="mark" />
        </Link>
        <nav className="nav__links" aria-label="Primary">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className={`nav__link${pathname.startsWith(l.href) ? ' nav__link--active' : ''}`}>{l.label}</Link>)}
        </nav>
        <div className="nav__actions">
          <button type="button" className={`nav__wallet${wallet ? ' nav__wallet--on' : ''}`} onClick={connect} title={error || ''}>
            {wallet ? <>{short(wallet)}{balance !== null && <small className="nav__balance">{balance} ETH</small>}</> : 'Connect Wallet'}
          </button>
          <Link href="/launcher" className="nav__cta">Launch Token</Link>
          <button type="button" className="nav__burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}><span /><span /></button>
        </div>
      </div>
      {wrongChain && wallet && <button type="button" className="nav__chain-warning" onClick={() => connect()}>Switch to Robinhood Chain · 4663</button>}
      {error && <div className="nav__wallet-error">{error}</div>}
      {open && <div className="nav__mobile"><Link href="/launcher">Launcher</Link><Link href="/discover">Discover</Link><Link href="/trade">Trade</Link><Link href="/community">Community</Link><Link href="/launcher" style={{ color: 'rgba(29,29,29,.5)' }}>Launch a Token ↗</Link></div>}
    </header>
  );
}
