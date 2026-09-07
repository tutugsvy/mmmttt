'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Reveal from '../../components/Reveal';
import { TOKENS, loadLiveTokens, sparkPath, fmtUsd, fmtNum } from '../../lib/tokens';

const FILTERS = ['All', 'New', 'Trending', 'Rising', 'Community'];

function imageUrl(value) {
  const src = String(value || '').trim();
  if (!src) return '';
  if (src.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${src.slice(7)}`;
  return src;
}

export default function DiscoverPage() {
  const [filter, setFilter] = useState('All');
  const [tokens, setTokens] = useState(TOKENS);

  useEffect(() => {
    let active = true;
    loadLiveTokens().then((live) => { if (active && live.length) setTokens(live); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const rows =
    filter === 'All'
      ? tokens
      : tokens.filter((t) => t.cat.includes(filter.toLowerCase()));

  return (
    <main className="page-enter">
      <section className="pagehead">
        <div className="wrap">
          <span className="pagehead__crumb micro micro--ink">Motive / Discover</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/discover.png" alt="MOTIVE Discover" className="mark pagehead__mark" />
          <h1 className="h1">Find What&rsquo;s Moving.</h1>
          <p className="lede">
            Tokens launched through MOTIVE — presented as cultural movements,
            not financial instruments.
          </p>
        </div>
      </section>

      <div className="wrap">
        <div className="disc__filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`chip${filter === f ? ' chip--on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', alignSelf: 'center' }} className="micro">
            {rows.length} movements
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="empty-market">
            <span className="micro">No live tokens yet</span>
            <h2 className="h2">The first movement<br />starts here.</h2>
            <p className="lede">MOTIVE is a new launchpad. Discover will populate only after a community deploys a token through the live factory.</p>
            <Link href="/launcher" className="btn btn--solid">Launch the First Token <span className="arr">→</span></Link>
          </div>
        ) : (
          <>
            <div className="trow trow--head" aria-hidden="true">
              <span>#</span><span /><span>Project</span><span className="trow__stat--h">Market Cap</span><span>Volume 24h</span><span className="trow__stat--h">Holders</span><span className="trow__stat--h">Activity</span><span>Age</span><span />
            </div>
            {rows.map((t, i) => (
              <Reveal key={t.slug} delay={Math.min(i * 40, 240)}>
                <Link href={`/project/${t.slug}`} className="trow" style={{ display: 'grid' }}>
                  <span className="trow__idx num">{String(i + 1).padStart(2, '0')}</span><span className="trow__mono">{imageUrl(t.image) ? <img src={imageUrl(t.image)} alt={`${t.ticker} logo`} width="34" height="34" /> : <span>{t.ticker?.slice(0, 2) || '—'}</span>}</span><span className="trow__name"><b>{t.name}{t.cat.includes('new') && <span className="tagline-pill">New</span>}{t.cat.includes('trending') && <span className="tagline-pill">Trending</span>}</b><span>{t.blurb}</span></span><span className="trow__stat trow__stat--h num">{fmtUsd(t.mcap)}</span><span className="trow__stat num">{fmtUsd(t.vol)}</span><span className="trow__stat trow__stat--h num">{fmtNum(t.holders)}</span><span className="trow__spark"><svg viewBox="0 0 100 34" preserveAspectRatio="none"><path d={sparkPath(t.slug)} /></svg></span><span className="trow__stat num" style={{ color: 'var(--dim)' }}>{t.age}</span><span className="trow__go">→</span>
                </Link>
              </Reveal>
            ))}
          </>
        )}

        <div style={{ padding: '56px 0 96px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="micro">Ready to move?</span>
          <Link href="/launcher" className="btn btn--solid">Launch a Token <span className="arr">→</span></Link>
        </div>
      </div>
    </main>
  );
}
