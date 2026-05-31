import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'GameHub — Društvene igre u browseru',
  description: 'Tvoj hub za društvene igre. Impostor, Alias, Avalon i više!',
  metadataBase: new URL('https://impostor-web.vercel.app'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GameHub',
  },
};

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className={cn('h-full antialiased', spaceGrotesk.variable, 'font-sans')}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3801758630975994"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="min-h-full flex flex-col font-sans selection:bg-violet-500/30"
        style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      >
        {/* Fixed glassmorphism shell header */}
        <header
          className="fixed top-3 left-4 right-4 z-50 flex items-center justify-between px-5 py-2.5 rounded-2xl"
          style={{
            background: 'rgba(8,11,20,0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            GameHub
          </span>
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
            />
            <span className="text-[11px] text-slate-500 font-medium">Online</span>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
