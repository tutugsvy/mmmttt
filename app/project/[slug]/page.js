import Link from 'next/link';
import { notFound } from 'next/navigation';
import Reveal from '../../../components/Reveal';
import CopyAddress from '../../../components/CopyAddress';
import { loadTokenLive } from '../../../lib/live';
import { loadGmgnToken } from '../../../lib/gmgn-live';
import { getToken, loadLiveTokens, loadTokenByContract, TOKENS, sparkPath, fmtUsd, fmtNum, mockTx, chartSeries } from '../../../lib/tokens';

const REGISTRY_API = 'https://api.motivepad.fun/api/motive-tokens';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const slug = typeof params?.slug === 'string' ? params.slug : params?.slug?.[0];
  const t = getToken(slug) || (await loadLiveTokens().catch(() => [])).find((x) => x.slug === slug) || (slug?.startsWith('token-0x') ? await loadTokenByContract(slug.slice(6)).catch(() => null) : null);
  if (!t) return { title: 'Project — MOTIVE' };
  return { title: `${t.name} ($${t.ticker}) — MOTIVE`, description: t.blurb };
}

export default async function ProjectPage({ params }) {
  const slug = typeof params?.slug === 'string' ? params.slug : params?.slug?.[0];
  const registry = await fetch(REGISTRY_API, { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).catch(() => null);
  const t = getToken(slug) || (Array.isArray(registry?.tokens) ? registry.tokens.find((x) => x.slug === slug) : null) || (await loadLiveTokens().catch(() => [])).find((x) => x.slug === slug) || (slug?.startsWith('token-0x') ? await loadTokenByContract(slug.slice(6)).catch(() => null) : null);
  if (!t) notFound();
  const live = t.contract ? await loadTokenLive(t.contract).catch(() => null) : null;
  const screening = t.contract?.toLowerCase() === '0xc37f9b4eb729a1833f6bbef3400ce4be203dc691' ? await loadGmgnToken().catch(() => null) : null;
  const tokenImage = t.image || screening?.logo || '';
  const tokenWebsite = t.website || screening?.website || '';
  const tokenTwitter = t.twitter || screening?.twitter || '';
  const price = t.mcap > 0 ? (t.mcap / 1_000_000_000) * (1 + (t.vol / t.mcap) * 0.4) : 0;
  const priceLabel = t.mcap > 0 ? `$${price.toFixed(4)}` : '—';
  const changeLabel = t.mcap > 0 ? `+${(4 + (t.vol / t.mcap) * 40).toFixed(1)}% 24H` : 'LIVE · NO MARKET DATA';
  const txs = mockTx(t.slug);
  const data = chartSeries(t.slug, 60);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const line =
    'M' +
    data
      .map((v, i) => `${((i / (data.length - 1)) * 100).toFixed(1)} ${(34 - ((v - min) / (max - min || 1)) * 30).toFixed(1)}`)
      .join(' L ');

  return (
    <main className="page-enter">
      <section className="pagehead proj__head">
        <div className="wrap">
          <div className="pagehead__crumb">
            <span className="micro micro--ink">Motive / Discover /</span>
            <Link href="/discover" className="micro">All movements</Link>
          </div>

          <div className="proj__id">
            {tokenImage ? <img className="proj__mono" src={tokenImage} alt={`${t.name} logo`} /> : <span className="proj__mono">{t.ticker.slice(0, 2)}</span>}
            <div>
              <h1 className="h1" style={{ marginBottom: 8 }}>{t.name}</h1>
              <span className="h3" style={{ color: 'var(--dim)' }}>${t.ticker}</span>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <b className="num" style={{ fontSize: 30, fontWeight: 500 }}>{priceLabel}</b>
              <div className="micro" style={{ color: '#3f7d4f', marginTop: 4 }}>{changeLabel}</div>
            </div>
          </div>

          <p className="proj__manifesto">{t.manifesto}</p>

          <div className="proj__actions">
            <Link href={`/trade?token=${t.contract}`} className="btn btn--solid">Trade <span className="arr">→</span></Link>
          </div>

          <div className="proj__stats">
            <div className="proj__stat"><span className="micro">Market Cap</span><b className="num">{live?.marketCapEth ? `${live.marketCapEth.toFixed(3)} ETH` : '—'}</b></div>
            <div className="proj__stat"><span className="micro">Liquidity</span><b className="num">{live?.liquidityEth ? `${live.liquidityEth.toFixed(3)} ETH` : '—'}</b></div>
            <div className="proj__stat"><span className="micro">Holders</span><b className="num">{live?.holders || screening?.holders || '—'}</b></div>
            <div className="proj__stat"><span className="micro">Members</span><b className="num">{fmtNum(t.members)}</b></div>
            <div className="proj__stat"><span className="micro">Launched</span><b>{t.age}</b></div>
          </div>
          {t.contract && <div className="proj__contract" style={{ marginTop: 24, padding: '16px 18px', border: '1px solid var(--hair)', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            {tokenImage ? <img src={tokenImage} alt={`${t.name} logo`} width="64" height="64" style={{ objectFit: 'cover', border: '1px solid var(--hair)', borderRadius: '50%' }} /> : null}
            <div><span className="micro">LIVE CONTRACT · {t.network}</span><div className="num" style={{ marginTop: 7, fontSize: 13, overflowWrap: 'anywhere' }}>{t.contract}</div></div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}><CopyAddress address={t.contract} /><a className="btn btn--ghost" href={t.explorer} target="_blank" rel="noopener noreferrer">View Contract ↗</a></div>
          </div>}
        </div>
      </section>

      <div className="wrap">
        <nav className="proj__tabs" aria-label="Project sections">
          <a className="proj__tab" href="#about">About</a>
          <a className="proj__tab" href="#market">Market</a>
          <a className="proj__tab" href="#community">Community</a>
          <a className="proj__tab" href="#activity">Activity</a>
          <a className="proj__tab" href="#social">Social</a>
        </nav>

        <section id="about" className="proj__section">
          <h2 className="h3">About</h2>
          <p className="lede" style={{ maxWidth: '68ch' }}>
            {t.blurb} {t.manifesto}
          </p>
        </section>

        <section id="market" className="proj__section">
          <h2 className="h3">Market</h2>
          <div className="trade__panel" style={{ padding: 26 }}>
            <svg viewBox="0 0 100 34" style={{ width: '100%', height: 180 }} preserveAspectRatio="none">
              <path d={line} fill="none" stroke="var(--ink)" strokeWidth="0.6" opacity="0.8" />
            </svg>
            <div className="trade__stats" style={{ borderTop: '1px solid var(--hair)', marginTop: 18 }}>
              <div className="trade__stat"><span className="micro">Price</span><b className="num">{live ? `${live.priceEth.toFixed(12)} ETH` : priceLabel}</b></div>
              <div className="trade__stat"><span className="micro">Liquidity</span><b className="num">{live ? `${live.liquidityEth.toFixed(3)} ETH` : fmtUsd(Math.round(t.mcap * 0.12))}</b></div>
              <div className="trade__stat"><span className="micro">Supply</span><b className="num">1.00B</b></div>
              <div className="trade__stat"><span className="micro">Holders</span><b className="num">{fmtNum(t.holders)}</b></div>
            </div>
          </div>
        </section>

        <section id="community" className="proj__section">
          <h2 className="h3">Community</h2>
          <p className="lede">
            {fmtNum(t.members)} members · growing {t.growth} this week. The people behind{' '}
            {t.name.toUpperCase()} are its actual infrastructure.
          </p>
          <div style={{ marginTop: 26 }}>
            <Link href="/community" className="btn btn--ghost">Open Community <span className="arr">→</span></Link>
          </div>
        </section>

        <section id="activity" className="proj__section">
          <h2 className="h3">Activity</h2>
          <table className="txtable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Side</th>
                <th>Wallet</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th style={{ textAlign: 'right' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {(live?.activity || txs).map((x, i) => (
                <tr key={i}>
                  <td className="side--buy" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.18em' }}>SWAP</td>
                  <td className="num" style={{ color: 'var(--dim)' }}>{x.sender || x.wallet || '—'}</td>
                  <td className="num" style={{ textAlign: 'right' }}>—</td>
                  <td className="num" style={{ textAlign: 'right' }}>—</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--dim)' }}>Block {x.block}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="social" className="proj__section">
          <h2 className="h3">Social</h2>
          <div className="socials">
            {tokenWebsite && <a href={tokenWebsite} target="_blank" rel="noopener noreferrer">Website ↗</a>}
            {tokenTwitter && <a href={tokenTwitter} target="_blank" rel="noopener noreferrer">X / Twitter ↗</a>}
          </div>
        </section>

        <div style={{ padding: '48px 0 110px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Link href="/discover" className="btn btn--ghost">← Back to Discover</Link>
          <Link href="/launcher" className="btn btn--solid">Launch Your Own <span className="arr">→</span></Link>
        </div>
      </div>
    </main>
  );
}
