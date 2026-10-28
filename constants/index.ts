// ========================================================================
// Constants — Dancing with the SARs (Revised Design System)
// Survey-document aesthetic. No neon, no glow.
// ========================================================================

import type { AreaOfInterest } from '@/types';

// ── Navigation ───────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Flood', href: '/explore?mode=flood' },
  { label: 'River Erosion', href: '/explore?mode=erosion' },
  { label: 'Deforestation', href: '/explore?mode=deforestation' },
  { label: 'Surface Water', href: '/explore?mode=water' },
  { label: 'Data Source', href: '/data-sources' },
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

import { getReadyDemoAois } from '@/lib/case-studies';

// ── Demo Areas of Interest (pre-cached for offline demo) ─────────────────
export const DEMO_AOIS: AreaOfInterest[] = getReadyDemoAois();


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
  name: 'TerraPulse',
  tagline: 'See the Earth change in radar\'s eyes',
  version: '0.1.0',
  challenge: 'NASA Space Apps Challenge 2026',
  team: 'Team Bangladesh',
  github: 'https://github.com/your-team/dancing-with-sars',
} as const;

// ── Config-driven Metric Cards Table ──────────────────────────────────────
export interface MetricConfig {
  id: string;
  label: string;
  resultKey: string;
  fallbackKey?: string;
  unit?: string;
  format?: 'number' | 'percent';
  decimals?: number;
  nullText?: string;
  description?: string;
}

export const MODE_METRICS_CONFIG: Record<string, MetricConfig[]> = {
  'river-erosion': [
    {
      id: 'erosion-area',
      label: 'Erosion area',
      resultKey: 'metrics.erosionAreaKm2',
      fallbackKey: 'affectedAreaKm2',
      unit: 'km²',
      format: 'number',
      decimals: 2,
      description: 'Lost bankline to channel',
    },
    {
      id: 'accretion-area',
      label: 'Accretion area',
      resultKey: 'metrics.accretionAreaKm2',
      unit: 'km²',
      format: 'number',
      decimals: 2,
      description: 'New sandbars and char land',
    },
    {
      id: 'net-land-change',
      label: 'Net land change',
      resultKey: 'metrics.netLandChangeKm2',
      unit: 'km²',
      format: 'number',
      decimals: 2,
      description: 'Erosion vs accretion balance',
    },
    {
      id: 'erosion-rate',
      label: 'Erosion rate',
      resultKey: 'metrics.erosionRateKm2PerYear',
      unit: 'km²/year',
      format: 'number',
      decimals: 2,
      nullText: 'needs both dates',
      description: 'Annualized rate across scene interval',
    },
  ],
  flood: [
    {
      id: 'flooded-area',
      label: 'Flooded area',
      resultKey: 'affectedAreaKm2',
      unit: 'km²',
      format: 'number',
      decimals: 2,
      description: 'Inundated ground footprint',
    },
    {
      id: 'percent-of-area',
      label: 'Percent of area',
      resultKey: 'percentChanged',
      unit: '%',
      format: 'percent',
      decimals: 2,
      description: 'Proportion of total scene extent',
    },
    {
      id: 'signal-strength',
      label: 'Signal strength',
      resultKey: 'signalStrength',
      fallbackKey: 'confidence',
      unit: '%',
      format: 'percent',
      decimals: 1,
      description: 'Mean backscatter delta',
    },
  ],
  deforestation: [
    {
      id: 'forest-loss',
      label: 'Forest loss',
      resultKey: 'metrics.forestLossKm2',
      fallbackKey: 'affectedAreaKm2',
      unit: 'km²',
      format: 'number',
      decimals: 2,
      description: 'Detected canopy loss & disturbance',
    },
    {
      id: 'percent-of-area',
      label: 'Percent of area',
      resultKey: 'percentChanged',
      unit: '%',
      format: 'percent',
      decimals: 2,
      description: 'Fraction of scene extent affected',
    },
    {
      id: 'signal-strength',
      label: 'Signal strength',
      resultKey: 'signalStrength',
      fallbackKey: 'confidence',
      unit: '%',
      format: 'percent',
      decimals: 1,
      description: 'Mean backscatter loss intensity',
    },
  ],
  'surface-water': [
    {
      id: 'water-a',
      label: 'Water A',
      resultKey: 'metrics.waterAreaAKm2',
      unit: 'km²',
      format: 'number',
      decimals: 2,
      description: 'Initial water area (Scene A)',
    },
    {
      id: 'water-b',
      label: 'Water B',
      resultKey: 'metrics.waterAreaBKm2',
      unit: 'km²',
      format: 'number',
      decimals: 2,
      description: 'Final water area (Scene B)',
    },
    {
      id: 'water-change',
      label: 'Change',
      resultKey: 'metrics.waterDeltaKm2',
      unit: 'km²',
      format: 'number',
      decimals: 2,
      description: 'Net water area delta',
    },
    {
      id: 'water-change-pct',
      label: 'Change (%)',
      resultKey: 'metrics.waterDeltaPercent',
      unit: '%',
      format: 'percent',
      decimals: 1,
      description: 'Relative water extent variation',
    },
  ],
};

// ── AI Fallback Narrations ───────────────────────────────────────────────
export const FALLBACK_INSIGHTS: Record<string, string> = {
  sylhet:
    'Based on the radar backscatter analysis, significant flooding is observed in the Sylhet region. The strong decrease in radar return indicates widespread surface water over previously dry or vegetated land.',
  amazon:
    'The SAR imagery indicates substantial canopy loss within the analyzed area of the Amazon. A decrease in volume scattering suggests clear-cutting or severe degradation over the observation period.',
  jamuna:
    'SAR change analysis reveals notable riverbank erosion along the active braided channel of the Jamuna River, accompanied by sandbar accretion and sediment deposition in adjacent sections.',
  tanguar:
    'The radar backscatter comparison highlights substantial seasonal surface water dynamics in Tanguar Haor, showing major expansion of open wetland water extent between dry and monsoon seasons.',
  default:
    'The radar data shows notable structural changes in this area over the selected time period. These variations in backscatter typically indicate shifts in land cover, such as flooding, deforestation, or urban development.',
};


