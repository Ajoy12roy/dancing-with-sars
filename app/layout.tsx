// ========================================================================
// Root Layout — Dancing with the SARs
// Editorial/survey-document typography: Source Serif 4, Public Sans, IBM Plex Mono.
// Self-hosted via next/font/local for complete offline reliability.
// ========================================================================

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AnalysisModeProvider } from '@/context';
import './globals.css';

const sourceSerif = localFont({
  src: [
    {
      path: './fonts/SourceSerif4-Variable.woff2',
      style: 'normal',
    },
    {
      path: './fonts/SourceSerif4-Italic-Variable.woff2',
      style: 'italic',
    },
  ],
  variable: '--font-headline',
  display: 'swap',
});

const publicSans = localFont({
  src: [
    {
      path: './fonts/PublicSans-Variable.woff2',
      style: 'normal',
    },
    {
      path: './fonts/PublicSans-Italic-Variable.woff2',
      style: 'italic',
    },
  ],
  variable: '--font-body',
  display: 'swap',
});

const ibmPlexMono = localFont({
  src: [
    {
      path: './fonts/IBMPlexMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/IBMPlexMono-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/IBMPlexMono-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/IBMPlexMono-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/IBMPlexMono-Italic.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-data',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000')
  ),
  title: 'TerraPulse — SAR Change Detection',
  description: 'Earth insights. A safer tomorrow.',
  keywords: [
    'SAR',
    'Synthetic Aperture Radar',
    'Sentinel-1',
    'NISAR',
    'NASA',
    'change detection',
    'flood detection',
    'remote sensing',
    'NASA Space Apps Challenge',
  ],
  authors: [{ name: 'Team Bangladesh' }],
  openGraph: {
    title: 'TerraPulse — SAR Change Detection',
    description: 'Earth insights. A safer tomorrow.',
    images: [
      {
        url: '/brand/terrapulse-logo-full-navy.png',
        width: 1983,
        height: 793,
        alt: 'TerraPulse — Earth insights. A safer tomorrow.',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${sourceSerif.variable} ${publicSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('terrapulse-theme');var theme=(t==='dark'||t==='light')?t:'light';document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme;}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <AnalysisModeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AnalysisModeProvider>
      </body>
    </html>
  );
}
