import { Space_Grotesk } from 'next/font/google';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import './globals.css';

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

export const metadata = {
  title: 'MOTIVE — Community Token Launchpad',
  description:
    'MOTIVE turns internet attention into community-owned markets. Launch communities. Discover movements. Trade attention. Build together.',
  icons: { icon: '/favicon.png' },
  openGraph: {
    title: 'MOTIVE — Community Token Launchpad',
    description: 'Ideas move markets.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={grotesk.variable}>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
