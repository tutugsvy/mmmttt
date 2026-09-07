import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/motive.png" alt="MOTIVE" className="mark mark--invert footer__logo" />
            <p className="footer__statement">Built for the next movement.</p>
          </div>

          <div className="footer__col">
            <b>Navigate</b>
            <Link href="/launcher">Launcher</Link>
            <Link href="/discover">Discover</Link>
            <Link href="/trade">Trade</Link>
            <Link href="/community">Community</Link>
          </div>

          <div className="footer__col">
            <b>Social</b>
            <a href="https://x.com/motivepadfun" target="_blank" rel="noopener noreferrer">X / Twitter</a>
          </div>
        </div>

        <div className="footer__base">
          <span>MOTIVE — Community Token Launchpad</span>
          <span>© 2026 Motive. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
