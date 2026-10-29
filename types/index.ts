// ========================================================================
// SAR Data Types — Dancing with the SARs
// Core domain types for SAR scene data, change detection results, and AI insights.
// ========================================================================

import type { SensitivityData, SensitivityStep } from '@/lib/sensitivity';

export type { SensitivityData, SensitivityStep };

/** Date range for radar median composites */
export interface DateRange {
  start: string;
  end: string;
}

/** Geographic bounding box for an Area of Interest */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** A single SAR satellite scene (one date, one area) */
export interface SarScene {
  id: string;
  aoiId: string;
  date: string; // ISO 8601
  satellite: 'Sentinel-1' | string;
  polarization: 'VV' | 'VH' | 'HH' | 'HV' | string;
  previewUrl: string; // path to preprocessed PNG/WebP
  geotiffUrl?: string; // path to raw GeoTIFF (optional, server-side only)
  bounds: BoundingBox;
  metadata?: Record<string, string | number>;
}

export type AnalysisMode = 'flood' | 'river-erosion' | 'deforestation' | 'surface-water';

export interface ResultBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface ResultDates {
  a: string | null;
  b: string | null;
  days: number | null;
}

export interface ResultCategory {
  id: string;
  label: string;
  areaKm2: number;
  kind: 'gain' | 'loss' | 'persistent' | 'other' | string;
}

export type ResultMetrics = Record<string, number | null | undefined>;
export type ResultParams = Record<string, string | number | boolean | null | undefined>;

/** A pre-defined Area of Interest for the demo */
export interface AreaOfInterest {
  id: string;
  name: string;
  description: string;
  country: string;
  mode?: AnalysisMode | string;
  modeLabel?: string;
  displayMetadata?: Record<string, unknown>;
  bounds: BoundingBox;
  center: [number, number]; // [lat, lng]
  zoom: number;
  sceneBefore: SarScene;
  sceneAfter: SarScene;
  beforeRange?: DateRange;
  afterRange?: DateRange;
  honestyNote?: string;
  sensitivity?: SensitivityData;
}

/** Result of running the change-detection pipeline */
export interface ChangeResult {
  aoiId: string;
  name?: string;
  dateBefore: string;
  dateAfter: string;
  changeMapUrl: string; // path to the change-detection overlay image
  beforeImageUrl?: string;
  afterImageUrl?: string;
  beforeImage?: string;
  afterImage?: string;
  changeMapImage?: string;
  percentChanged: number; // 0–100
  affectedAreaKm2: number;
  confidence: number; // 0–1 or 0–100
  changeType?: 'flood' | 'deforestation' | 'urban_expansion' | 'agriculture' | string;
  histogram?: ChangeHistogramBin[];
  processedAt?: string; // ISO 8601 timestamp

  // Extended fields from result.json
  mode?: AnalysisMode | 'change' | string;
  signalStrength?: number;
  totalAreaKm2?: number;
  bounds?: ResultBounds | BoundingBox;
  center?: [number, number];
  zoom?: number;
  dates?: ResultDates;
  categories?: ResultCategory[];
  metrics?: ResultMetrics;
  params?: ResultParams;
  warnings?: string[];
  chartData?: Array<{ category: string; value: number }>;
  beforeRange?: DateRange;
  afterRange?: DateRange;
  honestyNote?: string;
  sensitivity?: SensitivityData;
}

/** Histogram bin for change intensity distribution */
export interface ChangeHistogramBin {
  label: string;
  minValue: number;
  maxValue: number;
  pixelCount: number;
  percentage: number;
}

/** AI-generated insight narrating the change-detection results */
export interface AIInsight {
  aoiId: string;
  summary: string;
  details: string;
  recommendations?: string[];
  isLive: boolean; // true if fetched from API, false if from cache
  generatedAt: string; // ISO 8601
  model?: string; // e.g. "claude-3-sonnet" or "gemini-pro"
}

/** API response wrapper */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  cached: boolean;
}

/** Application connection/offline state */
export interface AppStatus {
  isOnline: boolean;
  dataSource: 'live' | 'cached';
  lastUpdated: string;
}
