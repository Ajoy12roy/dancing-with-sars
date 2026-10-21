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
  title: 'Dancing with the SARs — SAR Change Detection Platform',
  description:
    'See the Earth change in radar\'s eyes. A platform that compares before/after SAR satellite images to detect and explain surface change with scientific precision and AI-narrated insight.',
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${publicSans.variable} ${ibmPlexMono.variable}`}
    >
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
