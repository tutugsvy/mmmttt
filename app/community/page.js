import Link from 'next/link';
import Reveal from '../../components/Reveal';
import { TOKENS, fmtNum } from '../../lib/tokens';

export const metadata = {
  title: 'Community — MOTIVE',
};

const DISCUSSIONS = [];
const CONTRIBUTORS = [];

export default function CommunityPage() {
  const sorted = [...TOKENS].sort((a, b) => b.members - a.members);

  return (
    <main className="page-enter">
      <section className="pagehead">
        <div className="wrap">
          <span className="pagehead__crumb micro micro--ink">Motive / Community</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/community.png" alt="MOTIVE Community" className="mark pagehead__mark" />
          <h1 className="h1">People Make It Move.</h1>
          <p className="lede">
            A token is not just a contract. It is a community with a reason to exist.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 'clamp(48px, 7vh, 88px)' }}>
        <div className="wrap comm__grid">
          <div>
            <Reveal>
              <span className="micro">Active Communities — Ranked by Momentum</span>
            </Reveal>
            <hr className="rule" style={{ margin: '22px 0 6px' }} />

            {sorted.map((t, i) => (
              <Reveal key={t.slug} delay={Math.min(i * 40, 240)}>
                <Link href={`/project/${t.slug}`} className="crow" style={{ display: 'grid' }}>
                  <span className="crow__mono">{t.ticker.slice(0, 2)}</span>
                  <span className="crow__meta">
                    <b>{t.name}</b>
                    <span>{t.blurb}</span>
                  </span>
                  <span className="crow__num">
                    <b className="num">{fmtNum(t.members)}</b>
                    <span>{t.growth}</span>
                  </span>
                </Link>
              </Reveal>
            ))}

            <Reveal>
              <div style={{ marginTop: 56 }}>
                <span className="micro">Discussions</span>
                <hr className="rule" style={{ margin: '22px 0 6px' }} />
                {DISCUSSIONS.map((d, i) => (
                  <div key={i} className="crow" style={{ display: 'grid', gridTemplateColumns: '1fr auto', cursor: 'pointer' }}>
                    <span className="crow__meta">
                      <b style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0 }}>{d.t}</b>
                      <span>{d.by} · {d.r} replies</span>
                    </span>
                    <span className="trow__go">→</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="feed">
            <span className="micro">Community Activity</span>
            <hr className="rule" style={{ margin: '18px 0 4px' }} />

            {DISCUSSIONS.length === 0 ? <div className="feed__empty"><span className="micro">No activity yet</span><p>Community activity will appear after the first token launches.</p></div> : DISCUSSIONS.map((d, i) => (
              <div key={i} className="feed__item"><em>Discussion</em>{d.t} · {d.by}</div>
            ))}

            <div style={{ marginTop: 26 }}>
              <em className="micro" style={{ display: 'block', marginBottom: 14 }}>Top contributors</em>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CONTRIBUTORS.map((c) => (
                  <span key={c} className="chip" style={{ cursor: 'default' }}>{c}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 32 }}>
              <Link href="/launcher" className="btn btn--solid" style={{ width: '100%', justifyContent: 'center' }}>
                Start a Community <span className="arr">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
