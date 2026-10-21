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

import sylhetResult from '@/data/precomputed/sylhet/result.json';
import jamunaResult from '@/data/precomputed/jamuna/result.json';
import amazonResult from '@/data/precomputed/amazon/result.json';
import tanguarResult from '@/data/precomputed/tanguar/result.json';

interface RawBounds {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}

function getCenterFromBounds(bounds?: RawBounds, fallback: [number, number] = [0, 0]): [number, number] {
  if (
    bounds &&
    typeof bounds.north === 'number' &&
    typeof bounds.south === 'number' &&
    typeof bounds.east === 'number' &&
    typeof bounds.west === 'number'
  ) {
    return [
      Number(((bounds.north + bounds.south) / 2).toFixed(5)),
      Number(((bounds.east + bounds.west) / 2).toFixed(5)),
    ];
  }
  return fallback;
}

// ── Demo Areas of Interest (pre-cached for offline demo) ─────────────────
export const DEMO_AOIS: AreaOfInterest[] = [
  {
    id: 'sylhet',
    mode: 'flood',
    name: 'Sylhet Flood 2022',
    description: 'Devastating monsoon floods in the Sylhet division, Bangladesh — widespread inundation of low-lying wetlands.',
    country: 'Bangladesh',
    displayMetadata: {
      mode: 'flood',
      modeLabel: 'Flood Inundation',
      badge: 'Flood Inundation',
      primaryMetricKey: 'floodedAreaKm2',
      hazardLabel: 'Flooded Area',
    },
    bounds: {
      north: sylhetResult.bounds?.north ?? 24.98017,
      south: sylhetResult.bounds?.south ?? 24.84992,
      east: sylhetResult.bounds?.east ?? 91.95012,
      west: sylhetResult.bounds?.west ?? 91.79992,
    },
    center: getCenterFromBounds(sylhetResult.bounds, [24.91504, 91.87502]),
    zoom: 11,
    sceneBefore: {
      id: 'S1-sylhet-pre',
      aoiId: 'sylhet',
      date: sylhetResult.dateBefore || '2022-05-10',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/api/images?aoi=sylhet&type=before',
      bounds: {
        north: sylhetResult.bounds?.north ?? 24.98017,
        south: sylhetResult.bounds?.south ?? 24.84992,
        east: sylhetResult.bounds?.east ?? 91.95012,
        west: sylhetResult.bounds?.west ?? 91.79992,
      },
    },
    sceneAfter: {
      id: 'S1-sylhet-post',
      aoiId: 'sylhet',
      date: sylhetResult.dateAfter || '2022-06-20',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/api/images?aoi=sylhet&type=after',
      bounds: {
        north: sylhetResult.bounds?.north ?? 24.98017,
        south: sylhetResult.bounds?.south ?? 24.84992,
        east: sylhetResult.bounds?.east ?? 91.95012,
        west: sylhetResult.bounds?.west ?? 91.79992,
      },
    },
  },
  {
    id: 'jamuna',
    mode: 'river-erosion',
    name: 'Jamuna River Erosion 2019 to 2024',
    description: 'Multi-year braided river channel migration, severe riverbank erosion, and sandbar accretion along the Jamuna River, Bangladesh.',
    country: 'Bangladesh',
    displayMetadata: {
      mode: 'river-erosion',
      modeLabel: 'River Bank Erosion',
      badge: 'River Erosion',
      primaryMetricKey: 'erosionAreaKm2',
      hazardLabel: 'Bank Erosion',
    },
    bounds: {
      north: jamunaResult.bounds?.north ?? 24.55015,
      south: jamunaResult.bounds?.south ?? 24.29979,
      east: jamunaResult.bounds?.east ?? 89.95002,
      west: jamunaResult.bounds?.west ?? 89.64980,
    },
    center: getCenterFromBounds(jamunaResult.bounds, [24.42497, 89.79991]),
    zoom: 10,
    sceneBefore: {
      id: 'S1-jamuna-pre',
      aoiId: 'jamuna',
      date: jamunaResult.dates?.a || '2019-02-15',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/api/images?aoi=jamuna&type=before',
      bounds: {
        north: jamunaResult.bounds?.north ?? 24.55015,
        south: jamunaResult.bounds?.south ?? 24.29979,
        east: jamunaResult.bounds?.east ?? 89.95002,
        west: jamunaResult.bounds?.west ?? 89.64980,
      },
    },
    sceneAfter: {
      id: 'S1-jamuna-post',
      aoiId: 'jamuna',
      date: jamunaResult.dates?.b || '2024-02-15',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/api/images?aoi=jamuna&type=after',
      bounds: {
        north: jamunaResult.bounds?.north ?? 24.55015,
        south: jamunaResult.bounds?.south ?? 24.29979,
        east: jamunaResult.bounds?.east ?? 89.95002,
        west: jamunaResult.bounds?.west ?? 89.64980,
      },
    },
  },
  {
    id: 'amazon',
    mode: 'deforestation',
    name: 'Amazon Deforestation',
    description: 'Tracking tropical rainforest canopy loss, logging, and agricultural clear-cutting in Rondônia, Brazilian Amazon using SAR backscatter analysis.',
    country: 'Brazil',
    displayMetadata: {
      mode: 'deforestation',
      modeLabel: 'Forest Canopy Loss',
      badge: 'Deforestation',
      primaryMetricKey: 'forestLossKm2',
      hazardLabel: 'Forest Loss',
    },
    bounds: {
      north: amazonResult.bounds?.north ?? -10.14988,
      south: amazonResult.bounds?.south ?? -10.35003,
      east: amazonResult.bounds?.east ?? -61.99992,
      west: amazonResult.bounds?.west ?? -62.20007,
    },
    center: getCenterFromBounds(amazonResult.bounds, [-10.24996, -62.10000]),
    zoom: 10,
    sceneBefore: {
      id: 'S1-amazon-pre',
      aoiId: 'amazon',
      date: amazonResult.dateBefore || '2021-01-01',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/api/images?aoi=amazon&type=before',
      bounds: {
        north: amazonResult.bounds?.north ?? -10.14988,
        south: amazonResult.bounds?.south ?? -10.35003,
        east: amazonResult.bounds?.east ?? -61.99992,
        west: amazonResult.bounds?.west ?? -62.20007,
      },
    },
    sceneAfter: {
      id: 'S1-amazon-post',
      aoiId: 'amazon',
      date: amazonResult.dateAfter || '2023-01-01',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/api/images?aoi=amazon&type=after',
      bounds: {
        north: amazonResult.bounds?.north ?? -10.14988,
        south: amazonResult.bounds?.south ?? -10.35003,
        east: amazonResult.bounds?.east ?? -61.99992,
        west: amazonResult.bounds?.west ?? -62.20007,
      },
    },
  },
  {
    id: 'tanguar',
    mode: 'surface-water',
    name: 'Tanguar Haor Seasonal Water',
    description: 'Seasonal surface water expansion and contraction in Tanguar Haor, a Ramsar protected wetland basin in Sunamganj, Bangladesh.',
    country: 'Bangladesh',
    displayMetadata: {
      mode: 'surface-water',
      modeLabel: 'Surface Water Dynamics',
      badge: 'Wetland Dynamics',
      primaryMetricKey: 'waterDeltaKm2',
      hazardLabel: 'Water Delta',
    },
    bounds: {
      north: tanguarResult.bounds?.north ?? 25.22011,
      south: tanguarResult.bounds?.south ?? 25.04979,
      east: tanguarResult.bounds?.east ?? 91.20020,
      west: tanguarResult.bounds?.west ?? 90.97976,
    },
    center: getCenterFromBounds(tanguarResult.bounds, [25.13495, 91.08998]),
    zoom: 11,
    sceneBefore: {
      id: 'S1-tanguar-pre',
      aoiId: 'tanguar',
      date: tanguarResult.dates?.a || '2023-02-15',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/api/images?aoi=tanguar&type=before',
      bounds: {
        north: tanguarResult.bounds?.north ?? 25.22011,
        south: tanguarResult.bounds?.south ?? 25.04979,
        east: tanguarResult.bounds?.east ?? 91.20020,
        west: tanguarResult.bounds?.west ?? 90.97976,
      },
    },
    sceneAfter: {
      id: 'S1-tanguar-post',
      aoiId: 'tanguar',
      date: tanguarResult.dates?.b || '2023-08-15',
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: '/api/images?aoi=tanguar&type=after',
      bounds: {
        north: tanguarResult.bounds?.north ?? 25.22011,
        south: tanguarResult.bounds?.south ?? 25.04979,
        east: tanguarResult.bounds?.east ?? 91.20020,
        west: tanguarResult.bounds?.west ?? 90.97976,
      },
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


