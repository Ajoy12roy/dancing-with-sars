// ========================================================================
// Constants — Dancing with the SARs (Revised Design System)
// Survey-document aesthetic. No neon, no glow.
// ========================================================================

import type { AreaOfInterest } from '@/types';

// ── Navigation ───────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Data Sources', href: '/data-sources' },
  { label: 'About', href: '/about' },
] as const;

// ── Design Tokens (JS-side mirror) ──────────────────────────────────────
export const COLORS = {
  paper: '#F1F0EC',
  paperWarm: '#E8E6E1',
  ink: '#1D2023',
  inkLight: '#3A3D42',
  inkMuted: '#6B6E73',
  teal: '#2C5C61',
  tealLight: '#3A7A80',
  rust: '#A8462E',
  rustLight: '#C05A3E',
  hairline: '#C7C4BC',
  hairlineLight: '#D8D5CE',
  hairlineDark: '#A9A69F',
  success: '#3B7A57',
  warning: '#A8462E',
  error: '#8B2E2E',
  info: '#2C5C61',
} as const;

// ── Change Map Color Scale (teal → rust for detected change) ─────────────
export const CHANGE_MAP_COLORS = {
  noChange: 'rgba(44, 92, 97, 0.03)',
  lowChange: 'rgba(44, 92, 97, 0.15)',
  mediumChange: 'rgba(168, 70, 46, 0.3)',
  highChange: 'rgba(168, 70, 46, 0.6)',
  extremeChange: 'rgba(139, 46, 46, 0.8)',
} as const;

// ── Demo Areas of Interest (pre-cached for offline demo) ─────────────────
export const DEMO_AOIS: AreaOfInterest[] = [
  {
    id: 'sylhet',
    name: 'Sylhet Flood 2024',
    description: 'Devastating monsoon floods in the Sylhet division, Bangladesh — one of the worst in recent history.',
    country: 'Bangladesh',
    bounds: { north: 25.2, south: 24.4, east: 92.2, west: 91.4 },
    center: [24.8, 91.8],
    zoom: 10,
    sceneBefore: {
      id: 'S1-sylhet-pre',
      aoiId: 'sylhet',
      date: '2024-05-15',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/data/sylhet/before.png',
      bounds: { north: 25.2, south: 24.4, east: 92.2, west: 91.4 },
    },
    sceneAfter: {
      id: 'S1-sylhet-post',
      aoiId: 'sylhet',
      date: '2024-06-20',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/data/sylhet/after.png',
      bounds: { north: 25.2, south: 24.4, east: 92.2, west: 91.4 },
    },
  },
  {
    id: 'amazon',
    name: 'Amazon Deforestation',
    description: 'Tracking deforestation patterns in the Brazilian Amazon using SAR change detection.',
    country: 'Brazil',
    bounds: { north: -2.0, south: -4.0, east: -58.0, west: -60.0 },
    center: [-3.0, -59.0],
    zoom: 9,
    sceneBefore: {
      id: 'S1-amazon-pre',
      aoiId: 'amazon',
      date: '2024-01-10',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/data/amazon/before.png',
      bounds: { north: -2.0, south: -4.0, east: -58.0, west: -60.0 },
    },
    sceneAfter: {
      id: 'S1-amazon-post',
      aoiId: 'amazon',
      date: '2024-07-15',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/data/amazon/after.png',
      bounds: { north: -2.0, south: -4.0, east: -58.0, west: -60.0 },
    },
  },
];

// ── Dataset Metadata ─────────────────────────────────────────────────────
export const DATASET_INFO = {
  sentinel1: {
    name: 'Sentinel-1 SAR GRD',
    provider: 'European Space Agency (ESA) via ASF DAAC',
    license: 'Free and open under Copernicus data policy',
    resolution: '10m ground range',
    band: 'C-band (5.405 GHz)',
    url: 'https://search.asf.alaska.edu/',
  },
  nisar: {
    name: 'NISAR L-Band SAR',
    provider: 'NASA / ISRO via ASF DAAC',
    license: 'Free and open (NASA open data policy)',
    resolution: '3-10m',
    band: 'L-band (1.257 GHz) + S-band',
    url: 'https://nisar.jpl.nasa.gov/',
  },
} as const;

// ── Application Config ───────────────────────────────────────────────────
export const APP_CONFIG = {
  name: 'Dancing with the SARs',
  tagline: 'See the Earth change in radar\'s eyes',
  version: '0.1.0',
  challenge: 'NASA Space Apps Challenge 2026',
  team: 'Team Bangladesh',
  github: 'https://github.com/your-team/dancing-with-sars',
} as const;

// ── AI Fallback Narrations ───────────────────────────────────────────────
export const FALLBACK_INSIGHTS: Record<string, string> = {
  sylhet: 'Based on the radar backscatter analysis, significant flooding is observed in the Sylhet region, covering approximately 450 km². The strong decrease in radar return indicates widespread surface water over previously dry or vegetated land.',
  amazon: 'The SAR imagery indicates substantial canopy loss within the analyzed area of the Amazon. A decrease in volume scattering suggests clear-cutting or severe degradation over the observation period.',
  default: 'The radar data shows notable structural changes in this area over the selected time period. These variations in backscatter typically indicate shifts in land cover, such as flooding, deforestation, or urban development.'
};
