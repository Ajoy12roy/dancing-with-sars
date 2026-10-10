// ========================================================================
// SAR Data Types — Dancing with the SARs
// Core domain types for SAR scene data, change detection results, and AI insights.
// ========================================================================

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
  satellite: 'Sentinel-1' | 'NISAR' | string;
  polarization: 'VV' | 'VH' | 'HH' | 'HV' | string;
  previewUrl: string; // path to preprocessed PNG/WebP
  geotiffUrl?: string; // path to raw GeoTIFF (optional, server-side only)
  bounds: BoundingBox;
  metadata?: Record<string, string | number>;
}

/** A pre-defined Area of Interest for the demo */
export interface AreaOfInterest {
  id: string;
  name: string;
  description: string;
  country: string;
  bounds: BoundingBox;
  center: [number, number]; // [lat, lng]
  zoom: number;
  sceneBefore: SarScene;
  sceneAfter: SarScene;
}

/** Result of running the change-detection pipeline */
export interface ChangeResult {
  aoiId: string;
  dateBefore: string;
  dateAfter: string;
  changeMapUrl: string; // path to the change-detection overlay image
  percentChanged: number; // 0–100
  affectedAreaKm2: number;
  confidence: number; // 0–1
  changeType: 'flood' | 'deforestation' | 'urban_expansion' | 'agriculture' | string;
  histogram?: ChangeHistogramBin[];
  processedAt: string; // ISO 8601 timestamp
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
