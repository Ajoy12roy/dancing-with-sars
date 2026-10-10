// ========================================================================
// Root Layout — Dancing with the SARs
// Editorial/survey-document typography: Source Serif 4, Public Sans, IBM Plex Mono.
// ========================================================================

import type { Metadata } from 'next';
import { Source_Serif_4, Public_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-data',
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
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
