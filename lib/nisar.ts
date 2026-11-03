import fs from 'fs';
import path from 'path';

export interface NisarThresholdEntry {
  thresholdDb: number;
  lowBackscatterAreaKm2: number;
  windowFraction: number;
}

export interface NisarRecord {
  date: string;
  granuleId: string;
  crid: string;
  dataMaturity: string;
  medianHhDb: number;
  validFraction: number;
  excluded: boolean;
  exclusionReason: string | null;
  referenceGrid: NisarThresholdEntry[];
}

export interface NisarBimodalityRule {
  rulePassed: boolean;
  verdict: string;
  rationale: string;
  eta: number;
  valleyRatio: number;
  perDateOtsuSpreadDb: number;
  otsuThresholdDb: number | null;
}

export interface NisarWindowInfo {
  description: string;
  crs: string;
  pixelSizeMeters: number;
  pixelAreaKm2: number;
  windowAreaKm2: number;
  cornersLonLat: {
    top_left: { lon: number; lat: number };
    top_right: { lon: number; lat: number };
    bottom_right: { lon: number; lat: number };
    bottom_left: { lon: number; lat: number };
  };
  caseBoundingBox: [number, number, number, number];
  caseBoundingBoxAreaKm2: number;
  caseBoundingBoxMethod: string;
  windowCoverageFractionOfCaseBbox: number;
  windowCoveragePercentageOfCaseBbox: number;
  comparabilityNote: string;
}

export interface NisarTimeseriesData {
  schemaVersion: number;
  aoiId: string;
  quantity: string;
  terminology: string;
  dataMaturity: string;
  crid: string;
  polarization: string;
  units: string;
  referenceGridDb: number[];
  gridNote: string;
  bimodalityRule: NisarBimodalityRule;
  window: NisarWindowInfo;
  records: NisarRecord[];
}

let cachedData: NisarTimeseriesData | null = null;

export function getNisarTimeseriesData(): NisarTimeseriesData {
  if (cachedData) {
    return cachedData;
  }
  const filePath = path.join(process.cwd(), 'data', 'nisar', 'hakaluki-haor', 'timeseries.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`NISAR timeseries data file not found at ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  cachedData = JSON.parse(raw) as NisarTimeseriesData;
  return cachedData;
}

