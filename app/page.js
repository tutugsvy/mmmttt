import Link from 'next/link';
import Reveal from '../components/Reveal';
import HeroVisual from '../components/HeroVisual';

export const metadata = {
  title: 'MOTIVE — Community Token Launchpad',
};

const PRODUCTS = [
  {
    n: '01',
    key: 'launcher',
    name: 'Launcher',
    href: '/launcher',
    desc: 'Create and launch community tokens around an idea, a crowd, or a cultural movement — in four deliberate steps.',
  },
  {
    n: '02',
    key: 'discover',
    name: 'Discover',
    href: '/discover',
    desc: 'Find what is gaining attention before it becomes obvious. Movements, presented as culture — not tickers.',
  },
  {
    n: '03',
    key: 'trade',
    name: 'Trade',
    href: '/trade',
    desc: 'Trade the markets communities create. A quiet, precise interface for attention in motion.',
  },
  {
    n: '04',
    key: 'community',
    name: 'Community',
    href: '/community',
    desc: 'The people behind every token. A token is not just a contract — it is a community with a reason to exist.',
  },
];

export default function Home() {
  return (
    <main className="page-enter">
      {/* 01 — HERO */}
      <section className="hero">
        <div className="hero__visual">
          <HeroVisual />
        </div>

        <div className="wrap hero__inner">
          <div className="hero__eyebrow">
            <span className="micro micro--ink">Motive — Community Token Launchpad</span>
          </div>

          <h1 className="display">
            Ideas
            <br />
            Move Markets.
          </h1>

          <div className="hero__sub">
            <p className="lede">
              A community token launchpad for the internet&rsquo;s next movements.
              Launch communities. Discover movements. Trade attention. Build together.
            </p>
            <span className="micro">Attention → Intention → Movement → Market</span>
          </div>

          <div className="hero__ctas">
            <Link href="/launcher" className="btn btn--solid">
              Launch a Token <span className="arr">→</span>
            </Link>
            <Link href="/discover" className="btn btn--ghost">
              Explore Tokens
            </Link>
          </div>
        </div>

        <div className="hero__foot">
          <div className="wrap">
            <span className="micro">Scroll to explore</span>
            <span className="micro">Ideas → Communities → Tokens → Markets</span>
          </div>
        </div>
      </section>

      {/* 02 — THE PROBLEM */}
      <section className="statement section">
        <div className="wrap statement__grid">
          <Reveal>
            <span className="micro">01 / The Problem</span>
          </Reveal>
          <div>
            <Reveal>
              <p className="statement__body">
                Internet culture moves faster than traditional financial
                infrastructure. <em>Attention forms, disperses, and is captured —
                while the communities that created it own nothing.</em>
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 03 — THE SOLUTION */}
      <section className="statement section" style={{ background: 'var(--paper)' }}>
        <div className="wrap statement__grid">
          <Reveal>
            <span className="micro">02 / The Solution</span>
          </Reveal>
          <div>
            <Reveal>
              <p className="statement__body">
                MOTIVE gives communities a native way to launch, discover,
                trade, and build around tokens.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <p className="lede statement__note">
                One launchpad. Four ways to move. Every market on MOTIVE begins
                with a reason — an idea worth gathering around.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 04 — ECOSYSTEM */}
      <section className="eco section">
        <div className="wrap">
          <div className="eco__head">
            <Reveal>
              <h2 className="h1">
                One Launchpad.
                <br />
                Four Ways to Move.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <span className="micro">Motive Ecosystem — 2026</span>
            </Reveal>
          </div>

          {PRODUCTS.map((p, i) => (
            <Reveal key={p.key} delay={i * 60}>
              <Link href={p.href} className="eco__row" style={{ display: 'grid' }}>
                <span className="eco__num num">{p.n}</span>
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/logos/${p.key}.png`} alt={`MOTIVE ${p.name}`} className="mark eco__mark" />
                </div>
                <div>
                  <h3 className="eco__name">{p.name}</h3>
                  <p className="eco__desc">{p.desc}</p>
                </div>
                <span className="eco__arr">↗</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 05 — FINAL CTA */}
      <section className="finale">
        <div className="wrap">
          <Reveal>
            <span className="micro">What&rsquo;s your motive?</span>
            <div className="finale__line" />
            <h2 className="display" style={{ fontSize: 'clamp(44px, 8vw, 120px)' }}>
              Launch It.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
              <Link href="/launcher" className="btn">
                Launch a Token <span className="arr">→</span>
              </Link>
              <Link href="/discover" className="btn btn--light" style={{ borderColor: 'rgba(245,244,241,.3)', color: 'rgba(245,244,241,.8)' }}>
                Explore Tokens
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
