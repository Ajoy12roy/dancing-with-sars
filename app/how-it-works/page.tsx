import type { Metadata } from 'next';
import { HowItWorksClient } from './HowItWorksClient';

export const metadata: Metadata = {
  title: 'How It Works — Dancing with the SARs',
  description:
    'Learn how Synthetic Aperture Radar (SAR) works, why it matters for Earth observation, and how our change detection pipeline processes satellite data.',
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
