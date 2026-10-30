import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore SAR Change Detection — TerraPulse',
  description: 'Analyze satellite Synthetic Aperture Radar change detection across global flood, erosion, and deforestation events.',
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
