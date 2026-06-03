import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthHeaderSlot } from '@/components/auth/AuthHeaderSlot';
import { GuestBanner } from '@/components/auth/GuestBanner';
import { UsernameSetup } from '@/components/auth/UsernameSetup';
import { HubNav } from '@/components/hub/HubNav';
import { PresenceTracker } from '@/components/presence/PresenceTracker';
import { Toaster } from 'sonner';
import { ReconnectOverlay } from '@/components/shared/ReconnectOverlay';

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
  other: {
    'google-adsense-account': 'ca-pub-3801758630975994',
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
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-end px-5 h-14"
          style={{
            background: '#0f1219',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <HubNav />
          <span
            className="absolute left-1/2 -translate-x-1/2 text-sm font-bold tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            GameHub
          </span>
          <AuthHeaderSlot />
        </header>

        {children}
        <GuestBanner />
        <UsernameSetup />
        <PresenceTracker />
        <ReconnectOverlay />
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#0f1221',
              border: '1px solid rgba(139,92,246,0.3)',
              color: '#e2e8f0',
              fontFamily: 'var(--font-sans)',
            },
          }}
        />
      </body>
    </html>
  );
}
